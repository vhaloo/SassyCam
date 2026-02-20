import sys
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QProgressBar
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QColor

class SplashWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.resize(500, 300)
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.bg_label = QLabel(self)
        self.bg_label.setStyleSheet("""
            background-color: rgba(20, 20, 20, 240);
            border-radius: 15px;
            border: 2px solid #FF007F;
        """)
        self.bg_label.resize(500, 300)
        
        # Title
        title = QLabel("SassyCam", self)
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("color: white; font-size: 36px; font-weight: bold; background: transparent;")
        title.setGeometry(0, 30, 500, 50)
        
        # Sassy Status
        self.status_label = QLabel("Judging your startup sequence...", self)
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("color: #FF007F; font-size: 16px; font-style: italic; background: transparent;")
        self.status_label.setGeometry(0, 100, 500, 30)
        
        # Progress
        self.progress = QProgressBar(self)
        self.progress.setGeometry(50, 180, 400, 25)
        self.progress.setStyleSheet("""
            QProgressBar {
                border: 2px solid #333;
                border-radius: 5px;
                text-align: center;
                color: white;
                background-color: #1a1a1a;
            }
            QProgressBar::chunk {
                background-color: #FF007F;
            }
        """)
        
        # Messages
        self.messages = [
            "Judging your startup sequence...",
            "Loading judgement modules...",
            "Polishing the lens...",
            "Applying satire filters...",
            "Connecting to the Hive Mind...",
            "Finding reasons to roast you...",
            "Almost ready to be mean..."
        ]
        self.counter = 0
        
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_progress)
        self.timer.start(500) # Update every 500ms
        
    def update_progress(self):
        val = self.progress.value()
        if val < 90:
            self.progress.setValue(val + 5)
            if val % 20 == 0:
                self.counter = (self.counter + 1) % len(self.messages)
                self.status_label.setText(self.messages[self.counter])

    def finish(self):
        self.progress.setValue(100)
        self.status_label.setText("Ready to roast.")
        QTimer.singleShot(500, self.close)
