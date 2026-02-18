# Neon Cyberpunk Palette
COLORS = {
    "background": "#121212",
    "surface": "#1E1E1E",
    "primary": "#BB86FC", # Purple
    "secondary": "#03DAC6", # Cyan
    "error": "#CF6679",
    "on_primary": "#000000",
    "on_surface": "#FFFFFF",
    "text_secondary": "#B0BEC5"
}

STYLESHEET = """
QMainWindow {
    background-color: #121212;
}

QWidget {
    font-family: 'Segoe UI', sans-serif;
    color: #FFFFFF;
}

QLabel#Title {
    font-size: 24px;
    font-weight: bold;
    color: #BB86FC;
}

QLabel#SassLabel {
    font-size: 14px;
    color: #03DAC6;
}

QPushButton {
    background-color: #1E1E1E;
    border: 2px solid #BB86FC;
    border-radius: 5px;
    padding: 8px 16px;
    color: #BB86FC;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #BB86FC;
    color: #000000;
}

QPushButton:pressed {
    background-color: #9965f4;
}

QSlider::groove:horizontal {
    border: 1px solid #3d3d3d;
    height: 8px;
    background: #1E1E1E;
    margin: 2px 0;
    border-radius: 4px;
}

QSlider::handle:horizontal {
    background: #03DAC6;
    border: 1px solid #03DAC6;
    width: 18px;
    height: 18px;
    margin: -6px 0;
    border-radius: 9px;
}

QTextEdit {
    background-color: #1E1E1E;
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    padding: 10px;
    font-size: 14px;
    color: #B0BEC5;
}

QDialog {
    background-color: #121212;
}

QLineEdit {
    background-color: #1E1E1E;
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    padding: 5px;
    color: #FFFFFF;
}
"""
