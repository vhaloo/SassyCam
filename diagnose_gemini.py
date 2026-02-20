import google.generativeai as genai
from src.core.auth_manager import AuthManager
import os

def diagnose():
    print("--- Gemini Diagnostics ---")
    
    # 1. Load Key
    auth = AuthManager()
    # Assuming 'Guest' or the last user. 
    # AuthManager loads profiles. If 'Guest' was used, we try that.
    # Or just check if we can get a key for 'Gemini' from the current context.
    # Since we are outside the app, we might need to simulate login.
    
    # Try to find a user with a Gemini key
    target_user = None
    for user in auth.profiles:
        auth.login(user)
        key = auth.get_api_key("Gemini")
        if key:
            print(f"Found Gemini key for user: {user}")
            target_user = user
            break
            
    if not target_user:
        print("No Gemini API key found in keyring for any profile.")
        return

    # 2. Configure
    try:
        genai.configure(api_key=key)
        print("GenAI configured.")
    except Exception as e:
        print(f"Config failed: {e}")
        return

    # 3. List Models
    print("\nListing available models...")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name} ({m.display_name})")
    except Exception as e:
        print(f"ListModels failed: {e}")
        print("Possible causes: Invalid Key, API not enabled, or Region blocked.")

if __name__ == "__main__":
    diagnose()
