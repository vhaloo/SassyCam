import unittest
import os
import tempfile
import json
from src.config import ConfigManager, DEFAULT_CONFIG

class TestConfigManager(unittest.TestCase):
    def setUp(self):
        # Create a temporary config file
        self.temp_file = tempfile.NamedTemporaryFile(delete=False)
        self.config_manager = ConfigManager()
        self.config_manager.CONFIG_FILE = self.temp_file.name

    def tearDown(self):
        self.temp_file.close()
        os.remove(self.temp_file.name)

    def test_default_config(self):
        # Should be initialized with defaults
        self.assertEqual(self.config_manager.get("provider"), "Gemini")

    def test_set_get(self):
        self.config_manager.set("test_key", "test_value")
        self.assertEqual(self.config_manager.get("test_key"), "test_value")

    def test_load_save(self):
        # Save a value
        self.config_manager.set("key", "value")
        
        # New manager pointing to same file
        new_manager = ConfigManager()
        new_manager.CONFIG_FILE = self.temp_file.name
        new_manager.load()
        self.assertEqual(new_manager.get("key"), "value")

if __name__ == '__main__':
    unittest.main()
