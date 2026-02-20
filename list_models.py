import google.generativeai as genai
import os

# Try to get key from environment or prompt user if needed
key = os.environ.get("GEMINI_API_KEY")
if not key:
    # Try AuthManager
    try:
        from src.core.auth_manager import AuthManager
        auth = AuthManager()
        key = auth.get_api_key("Gemini")
    except ImportError:
        pass

if not key:
    print("WARNING: No API Key found. Listing might fail or return limited results.")
else:
    genai.configure(api_key=key)

print("Listing available Gemini models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Name: {m.name}")
            try:
                print(f"Display Name: {m.display_name}")
            except:
                pass
            try:
                print(f"Description: {m.description}")
            except:
                pass
            print("-" * 20)
except Exception as e:
    print(f"Error listing models: {e}")
