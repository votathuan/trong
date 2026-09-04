import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Không tìm thấy GEMINI_API_KEY. Vui lòng kiểm tra lại file .env")
    exit()

print(f"Đang dùng API Key: {api_key[:10]}...{api_key[-5:]}")
genai.configure(api_key=api_key)

print("---")
print("List of available models:")
try:
    available_models = []
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            available_models.append(m.name)
            
    if not available_models:
        print("CẢNH BÁO: API Key của bạn KHÔNG có quyền truy cập vào bất kỳ model AI nào!")
except Exception as e:
    print("LỖI KHI GỌI TỚI GOOGLE:", e)
