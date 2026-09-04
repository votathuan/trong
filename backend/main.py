import fitz
import re
import json
import uuid
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Quiz AutoGrader API")

# Setup CORS to allow Next.js frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_rect_overlap(rect1, rect2, threshold=0.4):
    """Check if 2 rectangles overlap with sufficient area"""
    r1 = fitz.Rect(rect1)
    r2 = fitz.Rect(rect2)
    intersect = r1.intersect(r2)
    if intersect.is_empty:
        return False
    # If intersection is > 40% of the text rect area, it's highlighted
    return intersect.get_area() / r1.get_area() > threshold

def parse_pdf_quiz(file_path: str):
    doc = fitz.open(file_path)
    questions = []
    current_question = None
    
    for page in doc:
        # Extract highlight rects
        highlight_rects = []
        
        # Graphic drawings (e.g. from Word background color)
        page_area = page.rect.get_area()
        for d in page.get_drawings():
            fill = d.get("fill")
            if fill is not None:
                r_rect = fitz.Rect(d["rect"])
                # Ignore full-page backgrounds and white backgrounds
                if r_rect.get_area() < page_area * 0.8:
                    if not (isinstance(fill, (list, tuple)) and sum(fill) >= 2.9):
                        highlight_rects.append(r_rect)
                
        # PDF Annotations (e.g. from Acrobat highlighter)
        for annot in page.annots():
            if annot.type[0] == 8: # 8 = Highlight
                highlight_rects.append(annot.rect)
                
        # Extract text blocks
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block: continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text: continue
                    
                    bbox = fitz.Rect(span["bbox"])
                    is_highlighted = any(is_rect_overlap(bbox, hr) for hr in highlight_rects)
                    
                    # Also check if text color is red
                    color = span.get("color", 0)
                    r = (color >> 16) & 0xFF
                    g = (color >> 8) & 0xFF
                    b = color & 0xFF
                    is_red = (r > 150 and g < 100 and b < 100)
                    
                    is_correct_answer = is_highlighted or is_red
                    
                    # Detect questions (e.g., "Câu 1:", "Question 1:", or just "1.")
                    if re.match(r'^((Câu|Question)\s*\d+[:\.]|\d+\.)', text, re.IGNORECASE):
                        if current_question:
                            questions.append(current_question)
                        current_question = {
                            "id": len(questions) + 1,
                            "question": text,
                            "options": [],
                            "answer_index": -1
                        }
                    # Detect options (e.g., "A.", "B.", "C.", "D.")
                    elif re.match(r'^[A-D][:\.]\s+', text):
                        if current_question:
                            opt_index = len(current_question["options"])
                            current_question["options"].append(text)
                            if is_correct_answer:
                                current_question["answer_index"] = opt_index
                    else:
                        # Append broken text
                        if current_question:
                            if len(current_question["options"]) == 0:
                                current_question["question"] += " " + text
                            else:
                                current_question["options"][-1] += " " + text
                                if is_correct_answer:
                                    current_question["answer_index"] = len(current_question["options"]) - 1
                                    
    if current_question:
        questions.append(current_question)
        
    doc.close()
    return questions

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    # Save temp file
    temp_filename = f"temp_{uuid.uuid4()}.pdf"
    with open(temp_filename, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    try:
        # Parse PDF
        quiz_data = parse_pdf_quiz(temp_filename)
        return {"success": True, "data": quiz_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        import os
        if os.path.exists(temp_filename):
            os.remove(temp_filename)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
