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
            # Default to latest 2026 flash model for roasting
            model = self.config.get("gemini_model", "gemini-3.1-flash-preview")
            self.current_llm = GeminiProvider(key, model_name=model)
        elif self.provider == "OpenAI":
            # Default to latest 2026 models
            model = self.config.get("openai_model", "gpt-5.1-chat-latest")
            self.current_llm = OpenAIProvider(key, model_name=model)
        elif self.provider == "Claude":
            # Default to latest 2026 models
            model = self.config.get("claude_model", "claude-3-sonnet-4.6")
            self.current_llm = ClaudeProvider(key, model_name=model)
        elif self.provider == "Pollinations":
            model = self.config.get("pollinations_model", "openai")
            self.current_llm = PollinationsProvider(api_key=None, model_name=model)

    def set_provider(self, provider_name):
        self.config.set("provider", provider_name)
        self.load_provider()

    def generate_caricature(self, sass_level, response_text, image_bytes=None):
        import requests
        import json
        import base64
        import os
        import time
        
        # We need the Gemini API key
        gemini_key = self.auth.get_api_key("Gemini")
        if not gemini_key:
            print("Cannot generate caricature: Gemini API Key is missing.")
            return None
            
        # Determine style based on sass_level
        if sass_level < -66:
            style = "ethereal, angelic, highly detailed elegant pencil and watercolor drawing, beautiful soft lighting, masterpiece, 4K resolution"
        elif sass_level < -33:
            style = "radiant, happy, beautiful digital caricature drawing, vibrant colors, flattering, high quality"
        elif sass_level < 0:
            style = "friendly, cute, pleasant caricature sketch, soft art style"
        elif sass_level < 30:
            style = "slightly goofy caricature drawing, mild exaggeration, funny, hand-drawn style"
        elif sass_level < 60:
            style = "sassy cartoon caricature drawing, exaggerated features, humorous, comic book style"
        elif sass_level < 90:
            style = "unflattering grotesque caricature drawing, very exaggerated features, ugly, comedic, rough charcoal sketch"
        else:
            style = "horrifying monster caricature drawing, cursed image, absolute nightmare, maximum ugly, grotesque, dark messy sketch"

        # Create a prompt combining the style and a summary of the response
        short_text = response_text[:150] if len(response_text) > 150 else response_text
        prompt = f"""
        TASK: Create a caricature drawing based on the provided photo and description.
        DESCRIPTION: {short_text}
        ART STYLE: {style}
        INSTRUCTIONS: 
        1. Maintain a high level of resemblance to the person in the photo. 
        2. Replicate the person's features (hair, glasses, expression) and the background decor closely.
        3. Interpret the scene through the specified ART STYLE.
        4. Do not add any text to the image.
        """
        
        # Standard generateContent endpoint for multimodal output (Gemini 3.1)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={gemini_key}"
        
        parts = [{"text": prompt}]
        if image_bytes:
            b64_image = base64.b64encode(image_bytes).decode('utf-8')
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": b64_image
                }
            })

        payload = {
            "contents": [
                {
                    "parts": parts
                }
            ],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        }
        
        output_dir = os.path.join(os.path.expanduser("~"), "nanobanana-output")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        filename = f"caricature_{int(time.time())}.png"
        filepath = os.path.join(output_dir, filename)

        try:
            print(f"Generating caricature using Gemini 3.1 Flash Image (multimodal with image input): {style}")
            response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                # Multimodal response parsing
                if "candidates" in data and len(data["candidates"]) > 0:
                    parts = data["candidates"][0].get("content", {}).get("parts", [])
                    for part in parts:
                        if "inlineData" in part:
                            img_info = part["inlineData"]
                            b64_str = img_info.get("data")
                            if b64_str:
                                with open(filepath, "wb") as f:
                                    f.write(base64.b64decode(b64_str))
                                return filepath
                
                print(f"Gemini API success but no image part found. Response: {data}")
                return None
            else:
                print(f"Gemini Image API Error: {response.status_code} - Body: {response.text}")
                return None
                
        except Exception as e:
            print(f"Failed to generate caricature via Gemini REST: {e}")
            return None

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
            print(f"DEBUG AI ERROR: {e}")
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                return "I'm tired of looking at you. Come back when you're less boring. (Rate Limit Hit)"
            return f"AI Error: {e}"

    def _get_system_prompt(self, sass_level, user_speech_text, language):
        intensity = "mild"
        
        # Compliment logic for negative sass levels
        if sass_level < 0:
            if sass_level > -33:
                intensity = "mildly supportive"
                length_instruction = "Short and sweet: Max 20 words."
                compliment_rule = "1. Carefully observe their physical features, clothing, and the background. Comment on these specific details, but frame them as reflections of their gentle aura, kind eyes, and the warmth they bring to the world."
                positive_rule = f"5. End with an encouraging remark about their inner light in {language}."
                role = "supportive AI companion"
            elif sass_level > -66:
                intensity = "very complimentary"
                length_instruction = "Medium length: Max 40 words. Explain how their inner beauty shines through their physical presence."
                compliment_rule = "1. Analyze their face, posture, style, and room environment in detail. Praise how these specific physical elements radiate their beautiful soul, emotional depth, and positive energy."
                positive_rule = f"5. Be a total hype-man/hype-woman for their personality and spirit in {language}."
                role = "enthusiastic fan AI"
            else:
                intensity = "absolute simp / hopelessly in love"
                length_instruction = "Long and detailed: Max 70 words. Write a poetic ode connecting their physical reality to their beautiful soul."
                compliment_rule = "1. Closely examine every detail in the image: their hair, expression, clothing, lighting, and surroundings. Be absolutely overwhelmed by how these specific visual details perfectly manifest their profound inner beauty, wisdom, and grace. Treat them like a flawless deity."
                positive_rule = f"5. Profess your unwavering adoration for their very essence in {language}."
                role = "obsessed admirer AI"
            
            base_prompt = f"""
            You are SassyCam, but currently operating in "Compliment Mode" as a {role}.
            Current Compliment Intensity: {abs(sass_level)}/100 ({intensity}).
            IMPORTANT: Respond ONLY in {language}. 

            COMPLIMENT RULES:
            {compliment_rule}
            2. You MUST mention specific things you see in the image (e.g., the color of their shirt, the lighting, objects in the background, their smile).
            3. If the user spoke: "{user_speech_text}", find a way to agree with them or praise the wisdom in their voice/ideas in {language}.
            4. Make it personal. Use "you" and "your". 
            5. Be genuinely deeply nice, focus on profound inner qualities reflected by their outer appearance, avoid any sarcasm.
            {positive_rule}
            7. {length_instruction}
            8. No intro ("I see...", "Looking at you..."). Just jump right into the compliment.
            """
            return base_prompt

        # Length Logic: Higher Sass = Longer Roast
        if sass_level < 30:
            length_instruction = "Short and punchy: Max 20 words."
        elif sass_level < 70:
            length_instruction = "Medium length: Max 40 words. Explain why you are judging them."
        elif sass_level < 95:
            length_instruction = "Long and detailed: Max 70 words. Really dig into the specific details of their appearance and why it offends you."
        else:
            length_instruction = "Very Long Monologue: Max 120 words. Go on a rant. Deconstruct their entire existence based on this image. Be poetic in your cruelty."

        # Default Rule: End with a positive twist
        positive_rule = f"5. ALWAYS end with a witty, positive twist in {language}."
        
        if sass_level > 25: intensity = "passive-aggressive"
        if sass_level > 50: intensity = "uncomfortably personal"
        if sass_level > 80: 
            intensity = "VICIOUS and UNFORGIVING"
            # Rule Change: No positivity allowed
            positive_rule = "5. DO NOT say anything nice. Be strictly negative, judgmental, and cold. No compliments."
        
        if sass_level >= 95: 
            intensity = "EMOTIONAL DAMAGE - MAXIMUM PAIN"
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
        6. {length_instruction}
        7. No intro ("I see...", "Looking at you..."). Just jump into the sass.
        """
        return base_prompt
