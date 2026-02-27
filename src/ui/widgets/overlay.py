from PyQt6.QtWidgets import QLabel, QGraphicsDropShadowEffect
from PyQt6.QtCore import Qt, QPropertyAnimation, QPoint, QEasingCurve, QTimer
from PyQt6.QtGui import QFont, QColor
import random

class OverlayWidget(QLabel):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setWordWrap(True)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents) # Click-through
        self.hide() # Hidden by default
        
        # Shadow for readability
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(0, 0, 0, 255))
        shadow.setOffset(2, 2)
        self.setGraphicsEffect(shadow)
        
        self.base_pos = QPoint(0, 0)

    def show_sass(self, text, sass_level=50):
        self.setText(text)
        
        # Dynamic Styling based on Sass-O-Meter (-100 to 100)
        if sass_level < -66:
            # DEVOTION
            color = "#FF69B4" # Hot Pink
            font_family = "Brush Script MT" # Elegant/Poetic
            font_size = "36px"
            bg_alpha = 150
            border = "2px solid #FF1493"
        elif sass_level < -33:
            # FANBOY
            color = "#00BFFF" # Deep Sky Blue
            font_family = "Trebuchet MS"
            font_size = "32px"
            bg_alpha = 120
            border = "none"
        elif sass_level < 0:
            # SWEET
            color = "#98FB98" # Pale Green
            font_family = "Segoe UI"
            font_size = "28px"
            bg_alpha = 100
            border = "none"
        elif sass_level < 30:
            # MILD (Passive Aggressive)
            color = "#A8E6CF" # Mint
            font_family = "Comic Sans MS"
            font_size = "24px"
            bg_alpha = 80
            border = "none"
        elif sass_level < 60:
            # SASSY (Standard)
            color = "#FFD3B6" # Peach
            font_family = "Arial"
            font_size = "28px"
            bg_alpha = 100
            border = "none"
        elif sass_level < 90:
            # RUTHLESS / SAVAGE
            color = "#FF8B94" # Reddish
            font_family = "Verdana"
            font_size = "32px"
            bg_alpha = 150
            border = "2px solid red"
        else:
            # NUCLEAR / EMOTIONAL DAMAGE
            color = "#FF0000" # Pure Red
            font_family = "Impact"
            font_size = "48px"
            bg_alpha = 200
            border = "5px solid white"

        self.setStyleSheet(f"""
            color: {color};
            font-family: '{font_family}', 'Segoe UI', sans-serif;
            font-size: {font_size};
            font-weight: bold;
            background-color: rgba(0, 0, 0, {bg_alpha});
            padding: 15px;
            border-radius: 15px;
            border: {border};
        """)
        
        # Positioning logic (Bottom of Caricature Frame)
        if self.parent():
            p_w = self.parent().width()
            p_h = self.parent().height()
            
            # Subtitle takes 90% of frame width
            self.setFixedWidth(int(p_w * 0.9))
            self.adjustSize()
            
            x = (p_w - self.width()) // 2
            y = p_h - self.height() - 30 # Bottom margin within frame
            self.base_pos = QPoint(x, y)
            self.move(self.base_pos)

        self.show()

    def hide_overlay(self):
        self.hide()
