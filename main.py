import sys
# Import torch/whisper first to prevent WinError 1114 DLL initialization failure
try:
    import torch
    import whisper
except ImportError:
    pass # Will be handled by dependencies check later if critical

from PyQt6.QtWidgets import QApplication
from src.ui.main_window import MainWindow
from src.core.resource_manager import ResourceManager
from src.version import __version__

def main():
    print(f"Starting SassyCam v{__version__}")
    
    # 1. Ensure Dependencies (FFmpeg)
    ffmpeg_path = ResourceManager.ensure_ffmpeg()
    if not ffmpeg_path:
        print("Critical Error: FFmpeg not found or failed to download.")
        sys.exit(1)
        
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
