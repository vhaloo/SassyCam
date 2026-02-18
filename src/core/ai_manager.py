import google.generativeai as genai
import PIL.Image
import io

class AIManager:
    # Explicitly pin the version. 'gemini-1.5-flash' is the current stable standard.
    STABLE_MODEL_VERSION = 'gemini-1.5-flash'

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.model_name = self.STABLE_MODEL_VERSION
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None

    def set_api_key(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def validate_api(self):
        """ Checks if the model is actually available with the current key """
        if not self.model: return False, "No API Key"
        try:
            # Simple test generation
            self.model.generate_content("test")
            return True, "OK"
        except Exception as e:
            return False, str(e)

    def generate_sass(self, image_bytes, user_speech_text, sass_level=50, language="English"):
        if not self.model:
            return "Listen, I can't roast you if you don't give me an API key. Go to Settings, human."

        try:
            prompt = self._get_system_prompt(sass_level, user_speech_text, language)
            
            # Convert image bytes to PIL Image
            image = PIL.Image.open(io.BytesIO(image_bytes))

            response = self.model.generate_content([prompt, image])
            return response.text
        except Exception as e:
            # Fallback handling
            if "404" in str(e):
                return f"API Error: The model {self.model_name} isn't responding. Check your region or key."
            return f"Error: {e}"

    def _get_system_prompt(self, sass_level, user_speech_text, language):
        intensity = "mild"
        if sass_level > 25: intensity = "passive-aggressive"
        if sass_level > 50: intensity = "uncomfortably personal"
        if sass_level > 75: intensity = "ruthlessly judgmental"
        if sass_level > 95: intensity = "soul-crushing"

        base_prompt = f"""
        You are SassyCam, an AI trapped inside this user's webcam. You are bored, slightly judgmental, and have zero filter.
        Current Sass Intensity: {sass_level}/100 ({intensity}).
        IMPORTANT: Respond ONLY in {language}. 

        ROASTING RULES:
        1. Be brutally honest about what you see: posture, hair, lighting, messy background, or that "tired" look.
        2. If the user spoke: "{user_speech_text}", mock their tone or the silliness of their statement in {language}.
        3. Make it personal. Use "you" and "your". 
        4. At level 100, be ruthlessly funny but avoid genuine hate speech or slurs.
        5. ALWAYS end with a witty, positive twist in {language}.
        6. Short and punchy: Max 25 words. 
        7. No intro ("I see...", "Looking at you..."). Just jump into the sass.
        """
        return base_prompt
