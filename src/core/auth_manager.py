import os
import json
import keyring
import base64
from datetime import datetime

class AuthManager:
    """
    Manages user profiles, secure key storage, and simple RBAC.
    """
    APP_NAME = "SassyCam"
    PROFILE_FILE = "profiles.json"
    
    def __init__(self):
        self.profiles = self._load_profiles()
        self.current_user = None

    def _load_profiles(self):
        if not os.path.exists(self.PROFILE_FILE):
            # Default "Guest" profile
            return {"Guest": {"role": "user", "created_at": str(datetime.now())}}
        try:
            with open(self.PROFILE_FILE, "r") as f:
                return json.load(f)
        except:
            return {}

    def save_profiles(self):
        with open(self.PROFILE_FILE, "w") as f:
            json.dump(self.profiles, f, indent=4)

    def create_user(self, username, role="user"):
        if username in self.profiles:
            return False
        self.profiles[username] = {
            "role": role,
            "created_at": str(datetime.now())
        }
        self.save_profiles()
        return True

    def login(self, username):
        if username in self.profiles:
            self.current_user = username
            return True
        return False

    def get_role(self):
        if self.current_user:
            return self.profiles[self.current_user].get("role", "user")
        return "guest"

    # --- Secure Key Storage (Keyring) ---

    def set_api_key(self, provider, key):
        if not self.current_user:
            return False
        service_id = f"{self.APP_NAME}_{self.current_user}_{provider}"
        try:
            keyring.set_password(service_id, "api_key", key)
            return True
        except Exception as e:
            print(f"Keyring error: {e}")
            return False

    def get_api_key(self, provider):
        if not self.current_user:
            return None
        service_id = f"{self.APP_NAME}_{self.current_user}_{provider}"
        try:
            return keyring.get_password(service_id, "api_key")
        except Exception as e:
            print(f"Keyring retrieval error: {e}")
            return None
