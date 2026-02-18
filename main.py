import sys
import os

# WORKAROUND: Import torch before PyQt6 to avoid WinError 1114
try:
    import torch
    import whisper
except ImportError:
    pass

# Ensure we can import from src
sys.path.append(os.path.join(os.path.dirname(__file__)))

from PyQt6.QtWidgets import QApplication
from src.ui.main_window import MainWindow

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
