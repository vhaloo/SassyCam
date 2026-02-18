from abc import ABC, abstractmethod
import google.generativeai as genai
from openai import OpenAI
from anthropic import Anthropic
import io
import PIL.Image

class LLMProvider(ABC):
    def __init__(self, api_key):
        self.api_key = api_key

    @abstractmethod
    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        pass

class GeminiProvider(LLMProvider):
    def __init__(self, api_key, model_name="gemini-1.5-flash"):
        super().__init__(api_key)
        genai.configure(api_key=api_key)
        self.model_name = model_name
        self.model = genai.GenerativeModel(model_name)

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            image = PIL.Image.open(io.BytesIO(image_bytes))
            # Gemini 1.5 allows system instructions in the constructor or generate call
            # We'll prepend it to the prompt for safety across versions
            full_prompt = [system_prompt, f"\nUser said: {user_text}", image]
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"Gemini Error ({self.model_name}): {str(e)}"

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key, model_name="gpt-4o"):
        super().__init__(api_key)
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            import base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"User said: {user_text}"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=150
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"OpenAI Error ({self.model_name}): {str(e)}"

class ClaudeProvider(LLMProvider):
    def __init__(self, api_key, model_name="claude-3-5-sonnet-20241022"):
        super().__init__(api_key)
        self.client = Anthropic(api_key=api_key)
        self.model_name = model_name

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            import base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')

            message = self.client.messages.create(
                model=self.model_name,
                max_tokens=150,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": f"User said: {user_text}"
                            }
                        ]
                    }
                ]
            )
            return message.content[0].text
        except Exception as e:
            return f"Claude Error ({self.model_name}): {str(e)}"

class PollinationsProvider(LLMProvider):
    def __init__(self, api_key=None, model_name="openai"):
        super().__init__(api_key)
        self.model_name = model_name
        self.api_url = "https://text.pollinations.ai/"

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        # Pollinations Free Tier (Blind Roast)
        fallback_vision_text = (
            f"[SYSTEM: You are in 'Free Mode'. You CANNOT see the user. "
            f"Roast them based on their voice input: '{user_text}'. "
            f"If they are silent, mock their silence. Invent a reason why you can't see them.]"
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
            import requests
            headers = {"Content-Type": "application/json"}
            # We use 'openai' as the default model routing for Pollinations
            response = requests.post(f"{self.api_url}{self.model_name}", json=payload, headers=headers)
            if response.status_code == 200:
                return response.text
            else:
                return f"Pollinations Error: {response.status_code} - {response.text}"
        except Exception as e:
            return f"Pollinations Connection Error: {str(e)}"
