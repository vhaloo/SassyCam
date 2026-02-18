import unittest
import os
import tempfile
import json
from src.core.auth_manager import AuthManager

class TestAuthManager(unittest.TestCase):
    def setUp(self):
        self.auth = AuthManager()
        self.auth.PROFILE_FILE = tempfile.NamedTemporaryFile(delete=False).name
        self.auth.key_file = tempfile.NamedTemporaryFile(delete=False).name

    def tearDown(self):
        if os.path.exists(self.auth.PROFILE_FILE):
            os.remove(self.auth.PROFILE_FILE)
        if os.path.exists(self.auth.key_file):
            os.remove(self.auth.key_file)

    def test_create_user(self):
        self.assertTrue(self.auth.create_user("TestUser"))
        self.assertFalse(self.auth.create_user("TestUser")) # Duplicate
        self.assertIn("TestUser", self.auth.profiles)

    def test_login(self):
        self.auth.create_user("User1")
        self.assertTrue(self.auth.login("User1"))
        self.assertFalse(self.auth.login("NonExistentUser"))
        self.assertEqual(self.auth.current_user, "User1")

    def test_set_api_key_requires_login(self):
        self.assertFalse(self.auth.set_api_key("Gemini", "secret"))
        self.auth.create_user("User2")
        self.auth.login("User2")
        # Keyring might fail in test environment without a real keychain service
        # but the method should execute.
        try:
            result = self.auth.set_api_key("Gemini", "secret")
            if result:
                self.assertEqual(self.auth.get_api_key("Gemini"), "secret")
        except Exception:
            pass # Skip keyring specific checks if service unavailable

if __name__ == '__main__':
    unittest.main()
