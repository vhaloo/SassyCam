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
    def __init__(self, api_key):
        super().__init__(api_key)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            image = PIL.Image.open(io.BytesIO(image_bytes))
            response = self.model.generate_content([system_prompt, image])
            return response.text
        except Exception as e:
            return f"Gemini Error: {str(e)}"

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key):
        super().__init__(api_key)
        self.client = OpenAI(api_key=api_key)

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            # OpenAI requires base64 images
            import base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
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
            return f"OpenAI Error: {str(e)}"

class ClaudeProvider(LLMProvider):
    def __init__(self, api_key):
        super().__init__(api_key)
        self.client = Anthropic(api_key=api_key)

    def generate_roast(self, image_bytes, user_text, system_prompt, language="English"):
        try:
            import base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')

            message = self.client.messages.create(
                model="claude-3-opus-20240229",
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
            return f"Claude Error: {str(e)}"
