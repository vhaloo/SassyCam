import PIL.Image
import io
import google.generativeai as genai

# Import Providers
from src.core.providers import GeminiProvider, OpenAIProvider, ClaudeProvider

class AIManager:
    """
    Orchestrates AI interactions using multiple providers.
    """
    def __init__(self, auth_manager, config_manager):
        self.auth = auth_manager
        self.config = config_manager
        self.provider = self.config.get("provider", "Gemini")
        self.current_llm = None
        self.load_provider()

    def load_provider(self):
        """Loads the LLM instance based on the current user's settings."""
        # Refresh provider setting from config in case it changed
        self.provider = self.config.get("provider", "Gemini")
        key = self.auth.get_api_key(self.provider)
        
        if not key:
            self.current_llm = None
            return

        if self.provider == "Gemini":
            model = self.config.get("gemini_model", "gemini-1.5-flash")
            self.current_llm = GeminiProvider(key, model_name=model)
        elif self.provider == "OpenAI":
            model = self.config.get("openai_model", "gpt-4o")
            self.current_llm = OpenAIProvider(key, model_name=model)
        elif self.provider == "Claude":
            model = self.config.get("claude_model", "claude-3-5-sonnet-20241022")
            self.current_llm = ClaudeProvider(key, model_name=model)

    def set_provider(self, provider_name):
        self.config.set("provider", provider_name)
        self.load_provider()

    def generate_sass(self, image_bytes, user_speech_text, sass_level=50, language="English"):
        if not self.current_llm:
            self.load_provider()
            if not self.current_llm:
                return "I have no brain! Check your API Key in Settings."

        try:
            prompt = self._get_system_prompt(sass_level, user_speech_text, language)
            
            # Delegate to the specific provider implementation
            # Note: The provider classes handle image conversion/encoding internally
            response = self.current_llm.generate_roast(image_bytes, user_speech_text, prompt, language)
            return response

        except Exception as e:
            return f"AI Error: {e}"

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
