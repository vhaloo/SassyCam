import requests
import json
import random

class PollinationsProvider(LLMProvider):
    def __init__(self, api_key=None, model_name="openai"):
        super().__init__(api_key) # Key not used
        self.model_name = model_name
        self.api_url = "https://text.pollinations.ai/"

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        # Pollinations Free Tier often lacks Vision support or is unstable with images.
        # We perform a "Blind Roast" based on speech/context.
        
        fallback_vision_text = (
            f"[SYSTEM NOTE: You are in 'Free Mode' and cannot see the user's camera. "
            f"Pretend you are 'loading' the image or just roast them based on their silence or what they said: '{user_text}'. "
            f"Make up a reason why you can't see them (e.g. 'Your camera is too broken', 'I refused to look'). "
            f"Keep it within the persona.]"
        )

        full_prompt = f"{system_prompt}\n\n{fallback_vision_text}"
        
        payload = {
            "messages": [
                {"role": "system", "content": full_prompt},
                {"role": "user", "content": user_text if user_text else "..."}
            ],
            "model": self.model_name,
            "jsonMode": False
        }

        try:
            headers = {"Content-Type": "application/json"}
            response = requests.post(self.api_url, json=payload, headers=headers)
            if response.status_code == 200:
                try:
                    # Pollinations returns OpenAI-compatible JSON
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    return content
                except (KeyError, json.JSONDecodeError):
                    # Fallback if response is just text or unexpected format
                    return response.text
            else:
                return f"Pollinations Error: {response.status_code} - {response.text}"
        except Exception as e:
            return f"Pollinations Connection Error: {str(e)}"
