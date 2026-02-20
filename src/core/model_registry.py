from dataclasses import dataclass
from typing import List, Dict

@dataclass
class ModelInfo:
    id: str
    name: str

class ModelRegistry:
    """
    Central registry for available AI providers and their models.
    """
    PROVIDERS = ["Gemini", "OpenAI", "Claude", "Pollinations"]

    MODELS = {
        "Gemini": [
            ModelInfo("gemini-3.1-pro-preview", "Gemini 3.1 Pro (Preview)"),
            ModelInfo("gemini-3-flash-preview", "Gemini 3 Flash (Preview)"),
            ModelInfo("gemini-2.5-pro", "Gemini 2.5 Pro (Stable)"),
            ModelInfo("gemini-2.5-flash", "Gemini 2.5 Flash (Stable)"),
            ModelInfo("gemini-2.0-flash", "Gemini 2.0 Flash (Legacy)"),
        ],
        "OpenAI": [
            ModelInfo("gpt-5.1-chat-latest", "GPT-5.1 Chat (Latest)"),
            ModelInfo("gpt-5.2", "GPT-5.2 (High Intelligence)"),
            ModelInfo("gpt-4o", "GPT-4o (Legacy)"),
        ],
        "Claude": [
            ModelInfo("claude-3-sonnet-4.6", "Claude Sonnet 4.6 (Balanced)"),
            ModelInfo("claude-3-opus-4.6", "Claude Opus 4.6 (Smartest)"),
            ModelInfo("claude-3-haiku-4.5", "Claude Haiku 4.5 (Fast)"),
        ],
        "Pollinations": [
            ModelInfo("openai", "GPT-4o (Free/Proxy)"),
            ModelInfo("claude", "Claude 3.5 (Free/Proxy)"),
            ModelInfo("gemini", "Gemini Pro (Free/Proxy)"),
            ModelInfo("mistral", "Mistral Large (Free/Proxy)"),
            ModelInfo("llama", "Llama 3 (Free/Proxy)"),
        ]
    }

    @classmethod
    def get_models_for_provider(cls, provider: str) -> List[ModelInfo]:
        return cls.MODELS.get(provider, [])

    @classmethod
    def get_default_model(cls, provider: str) -> str:
        models = cls.get_models_for_provider(provider)
        if models:
            return models[0].id
        return ""

    @classmethod
    def is_valid_model(cls, provider: str, model_id: str) -> bool:
        # Also allow custom models not in the list (power user feature)
        return True 
