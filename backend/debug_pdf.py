import fitz

def debug_pdf(file_path):
    doc = fitz.open(file_path)
    page = doc[0]
    blocks = page.get_text("dict")["blocks"]
    
    print("--- PAGE 1 ---")
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        highlight_rects = []
        for d in page.get_drawings():
            if d.get("fill") is not None:
                highlight_rects.append(fitz.Rect(d["rect"]))
        for annot in page.annots():
            if annot.type[0] == 8:
                highlight_rects.append(annot.rect)
                
        def is_rect_overlap(rect1, rect2, threshold=0.4):
            r1 = fitz.Rect(rect1)
            r2 = fitz.Rect(rect2)
            intersect = r1.intersect(r2)
            if intersect.is_empty: return False
            return intersect.get_area() / r1.get_area() > threshold

        for block in blocks:
            if "lines" not in block: continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text: continue
                    color = span.get("color", 0)
                    r = (color >> 16) & 0xFF
                    g = (color >> 8) & 0xFF
                    b = color & 0xFF
                    bbox = fitz.Rect(span["bbox"])
                    is_hl = any(is_rect_overlap(bbox, hr) for hr in highlight_rects)
                    f.write(f"Text: {text!r} | isHL: {is_hl} | RGB: ({r}, {g}, {b})\n")
                
if __name__ == "__main__":
    # Find the pdf file in the current directory or a known path. 
    # The user's pdf seems to be uploaded via the web interface.
    # But we can ask them for the path, or we can look in their Downloads folder since the browser shows C:/Users/LOQ/Downloads/ôn TN TTHCM.pdf
    import os
    pdf_path = r"C:\Users\LOQ\Downloads\ôn TN TTHCM.pdf"
    if os.path.exists(pdf_path):
        debug_pdf(pdf_path)
    else:
        print("File not found:", pdf_path)
