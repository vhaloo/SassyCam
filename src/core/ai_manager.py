import PIL.Image
import io
import google.generativeai as genai

# Import Providers
from src.core.providers import GeminiProvider, OpenAIProvider, ClaudeProvider, PollinationsProvider

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
        
        # Pollinations is the only provider that works without a key
        if not key and self.provider != "Pollinations":
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
        elif self.provider == "Pollinations":
            model = self.config.get("pollinations_model", "openai")
            self.current_llm = PollinationsProvider(api_key=None, model_name=model)

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
            response = self.current_llm.generate_roast(image_bytes, user_speech_text, prompt, language)
            
            # Check for provider errors returned as strings
            if isinstance(response, str) and ("Error" in response or "429" in response):
                if "429" in response or "quota" in response.lower():
                     if language == "English":
                         return "I'm tired of looking at you. Come back when you're less boring. (Rate Limit Hit)"
                     elif language == "French":
                         return "Je suis fatigué de te regarder. Reviens quand tu seras moins ennuyeux. (Limite atteinte)"
                     elif language == "Japanese":
                         return "あなたを見るのは飽きました。もっと面白くなってから出直してきなさい。（レート制限）"
                     else:
                         return "I'm tired of looking at you. Come back later. (Rate Limit Hit)"
                return response

            return response

        except Exception as e:
            # Catch internal logic errors
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                return "I'm tired of looking at you. Come back when you're less boring. (Rate Limit Hit)"
            return f"AI Error: {e}"

    def _get_system_prompt(self, sass_level, user_speech_text, language):
        intensity = "mild"
        # Default Rule: End with a positive twist
        positive_rule = f"5. ALWAYS end with a witty, positive twist in {language}."
        
        if sass_level > 25: intensity = "passive-aggressive"
        if sass_level > 50: intensity = "uncomfortably personal"
        if sass_level > 80: 
            intensity = "VICIOUS and UNFORGIVING"
            # Rule Change: No positivity allowed
            positive_rule = "5. DO NOT say anything nice. Be strictly negative, judgmental, and cold. No compliments."
        
        if sass_level >= 98: 
            intensity = "NUCLEAR ROAST - MAXIMUM DAMAGE"
            # Rule Change: Absolute destruction
            positive_rule = "5. ABSOLUTELY NO POSITIVITY. DESTROY THEM VERBALLY. Target their deepest insecurities based on their appearance. Be savage."

        base_prompt = f"""
        You are SassyCam, an AI trapped inside this user's webcam. You are bored, slightly judgmental, and have zero filter.
        Current Sass Intensity: {sass_level}/100 ({intensity}).
        IMPORTANT: Respond ONLY in {language}. 

        ROASTING RULES:
        1. Be brutally honest about what you see: posture, hair, lighting, messy background, or that "tired" look.
        2. If the user spoke: "{user_speech_text}", mock their tone or the silliness of their statement in {language}.
        3. Make it personal. Use "you" and "your". 
        4. At level 100, be ruthlessly funny but avoid genuine hate speech or slurs.
        {positive_rule}
        6. Short and punchy: Max 25 words. 
        7. No intro ("I see...", "Looking at you..."). Just jump into the sass.
        """
        return base_prompt
