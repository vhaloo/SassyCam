from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QComboBox)
from src.core.auth_manager import AuthManager

class LoginDialog(QDialog):
    def __init__(self, auth_manager):
        super().__init__()
        self.auth = auth_manager
        self.setWindowTitle("SassyCam Login")
        self.setFixedSize(300, 200)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        
        layout.addWidget(QLabel("Select Profile:"))
        self.user_combo = QComboBox()
        self.user_combo.addItems(self.auth.profiles.keys())
        layout.addWidget(self.user_combo)

        self.pin_input = QLineEdit()
        self.pin_input.setPlaceholderText("Enter PIN (Optional)")
        self.pin_input.setEchoMode(QLineEdit.EchoMode.Password)
        # PIN logic can be added later for stricter RBAC
        # layout.addWidget(self.pin_input)

        self.login_btn = QPushButton("Login")
        self.login_btn.clicked.connect(self.handle_login)
        layout.addWidget(self.login_btn)

        self.new_user_btn = QPushButton("Create New Profile")
        self.new_user_btn.clicked.connect(self.create_profile)
        layout.addWidget(self.new_user_btn)

        self.setLayout(layout)

    def handle_login(self):
        user = self.user_combo.currentText()
        if self.auth.login(user):
            self.accept()

    def create_profile(self):
        # Simple prompt for new username
        # In a polished app, use a dedicated dialog or switch view
        new_user = "User " + str(len(self.auth.profiles) + 1)
        self.auth.create_user(new_user)
        self.user_combo.addItem(new_user)
        self.user_combo.setCurrentText(new_user)
