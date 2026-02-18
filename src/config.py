import json
import os

CONFIG_FILE = "config.json"

DEFAULT_CONFIG = {
    "api_key": "",
    "sass_level": 50,  # 0 to 100
    "voice_code": "af_heart", # Default Kokoro voice
    "camera_index": 0,
    "volume": 1.0,
    "audio_input_device": None,
    "audio_output_device": None,
    "whisper_model": "tiny",
    "auto_sass_interval": 45,
    "mic_threshold": 0.005
}

class ConfigManager:
    def __init__(self):
        self.config = DEFAULT_CONFIG.copy()
        self.load()

    def load(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    self.config.update(json.load(f))
            except Exception as e:
                print(f"Error loading config: {e}")

    def save(self):
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(self.config, f, indent=4)
        except Exception as e:
            print(f"Error saving config: {e}")

    def get(self, key):
        return self.config.get(key, DEFAULT_CONFIG.get(key))

    def set(self, key, value):
        self.config[key] = value
        self.save()
