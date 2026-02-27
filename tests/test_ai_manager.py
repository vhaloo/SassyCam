import pytest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.ai_manager import AIManager
from src.config import ConfigManager

class DummyAuthManager:
    def get_api_key(self, provider):
        return "dummy_key"

def test_negative_sass_level_prompt():
    config = ConfigManager()
    auth = DummyAuthManager()
    ai = AIManager(auth, config)
    
    # Test -100
    prompt_simp = ai._get_system_prompt(-100, "", "English")
    assert "Compliment Mode" in prompt_simp
    assert "obsessed admirer AI" in prompt_simp
    assert "poetic ode" in prompt_simp
    
    # Test -50
    prompt_fan = ai._get_system_prompt(-50, "", "English")
    assert "Compliment Mode" in prompt_fan
    assert "enthusiastic fan AI" in prompt_fan
    
    # Test -10
    prompt_sweet = ai._get_system_prompt(-10, "", "English")
    assert "Compliment Mode" in prompt_sweet
    assert "supportive AI companion" in prompt_sweet
    
    # Test 50 (Original logic)
    prompt_roast = ai._get_system_prompt(50, "", "English")
    assert "Compliment Mode" not in prompt_roast
    assert "bored, slightly judgmental" in prompt_roast
