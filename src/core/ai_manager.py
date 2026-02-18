import google.generativeai as genai
import PIL.Image
import io

class AIManager:
    def __init__(self, api_key=None):
        self.api_key = api_key
        self.model_name = 'gemini-2.5-flash'
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None

    def set_api_key(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def generate_sass(self, image_bytes, user_speech_text, sass_level=50):
        if not self.model:
            return "Listen, I can't roast you if you don't give me an API key. Go to Settings, human."

        try:
            prompt = self._get_system_prompt(sass_level, user_speech_text)
            
            # Convert image bytes to PIL Image
            image = PIL.Image.open(io.BytesIO(image_bytes))

            response = self.model.generate_content([prompt, image])
            return response.text
        except Exception as e:
            if "404" in str(e):
                # Try fallback to gemini-pro or gemini-3-flash-preview
                try:
                    self.model_name = 'gemini-3-flash-preview'
                    self.model = genai.GenerativeModel(self.model_name)
                    return self.generate_sass(image_bytes, user_speech_text, sass_level)
                except:
                    return f"Look, I'm trying to roast you but the API is acting up. Error: {e}"
            return f"Error: {e}"

    def _get_system_prompt(self, sass_level, user_speech_text):
        intensity = "mild"
        if sass_level > 25: intensity = "passive-aggressive"
        if sass_level > 50: intensity = "uncomfortably personal"
        if sass_level > 75: intensity = "ruthlessly judgmental"
        if sass_level > 95: intensity = "soul-crushing"

        base_prompt = f"""
        You are SassyCam, an AI trapped inside this user's webcam. You are bored, slightly judgmental, and have zero filter.
        Current Sass Intensity: {sass_level}/100 ({intensity}).

        ROASTING RULES:
        1. Be brutally honest about what you see: posture, hair, lighting, messy background, or that "tired" look.
        2. If the user spoke: "{user_speech_text}", mock their tone or the silliness of their statement.
        3. Make it personal. Use "you" and "your". 
        4. At level 100, be ruthlessly funny but avoid genuine hate speech or slurs.
        5. ALWAYS end with a witty, positive twist. (e.g. "But hey, your cable management is... brave," or "At least your ceiling looks nice.")
        6. Short and punchy: Max 25 words. 
        7. No intro ("I see...", "Looking at you..."). Just jump into the sass.
        """
        return base_prompt
