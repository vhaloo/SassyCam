from dataclasses import dataclass
from typing import List, Dict

@dataclass
class AIModel:
    id: str
    name: str
    provider: str
    capabilities: List[str] # e.g. ["vision", "text"]
    is_experimental: bool = False

class ModelRegistry:
    """
    Central registry for available AI providers and their models.
    """
    PROVIDERS = ["Gemini", "OpenAI", "Claude", "Pollinations"]
    
    MODELS = {
        "Gemini": [
            AIModel("gemini-2.0-flash", "Gemini 2.0 Flash (Fast/Stable)", "Gemini", ["vision", "text"]),
            AIModel("gemini-2.5-flash", "Gemini 2.5 Flash (Latest)", "Gemini", ["vision", "text"]),
            AIModel("gemini-2.5-pro", "Gemini 2.5 Pro (High Reasoning)", "Gemini", ["vision", "text"]),
            AIModel("gemini-flash-latest", "Gemini Flash Latest (Experimental)", "Gemini", ["vision", "text"], is_experimental=True),
        ],
        "OpenAI": [
            AIModel("gpt-4o", "GPT-4o (Omni)", "OpenAI", ["vision", "text"]),
            AIModel("gpt-4o-mini", "GPT-4o Mini (Fast)", "OpenAI", ["vision", "text"]),
            AIModel("gpt-5.2", "GPT-5.2 (Experimental)", "OpenAI", ["vision", "text"], is_experimental=True),
        ],
        "Claude": [
            AIModel("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet", "Claude", ["vision", "text"]),
            AIModel("claude-3-opus-20240229", "Claude 3 Opus", "Claude", ["vision", "text"]),
            AIModel("claude-opus-4.6", "Claude Opus 4.6 (Experimental)", "Claude", ["vision", "text"], is_experimental=True),
        ],
        "Pollinations": [
            AIModel("openai", "Free Tier (Blind/Text Only)", "Pollinations", ["text"]),
            AIModel("search", "Free Tier (Web Search)", "Pollinations", ["text"]),
        ]
    }

    @classmethod
    def get_models_for_provider(cls, provider: str) -> List[AIModel]:
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
