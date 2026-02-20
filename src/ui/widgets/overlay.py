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
        
        self.shake_timer = QTimer(self)
        self.shake_timer.timeout.connect(self.shake_frame)
        self.base_pos = QPoint(0, 0)
        self.intensity = 0

    def show_sass(self, text, sass_level=50):
        self.setText(text)
        self.adjustSize()
        
        # Dynamic Styling
        if sass_level < 30:
            # Pastel / Nice
            color = "#A8E6CF" # Mint
            font_family = "Comic Sans MS" # Friendly/Silly
            font_size = "24px"
            border = "none"
            self.intensity = 0
        elif sass_level < 60:
            # Standard Sassy
            color = "#FFD3B6" # Peach
            font_family = "Arial"
            font_size = "28px"
            border = "none"
            self.intensity = 0
        elif sass_level < 90:
            # Mean
            color = "#FF8B94" # Pinkish Red
            font_family = "Verdana"
            font_size = "32px"
            border = "2px solid red"
            self.intensity = 2
        else:
            # Nuclear
            color = "#FF0000" # Pure Red
            font_family = "Impact"
            font_size = "48px"
            border = "5px solid white"
            self.intensity = 10

        self.setStyleSheet(f"""
            color: {color};
            font-family: '{font_family}';
            font-size: {font_size};
            font-weight: bold;
            background-color: rgba(0, 0, 0, 100);
            padding: 10px;
            border-radius: 10px;
            {border};
        """)
        
        # Centering logic (bottom area)
        if self.parent():
            parent_rect = self.parent().rect()
            w = min(parent_rect.width() - 40, 800)
            self.setFixedWidth(w)
            self.adjustSize() # Recalculate height
            
            x = (parent_rect.width() - self.width()) // 2
            y = parent_rect.height() - self.height() - 50
            self.base_pos = QPoint(x, y)
            self.move(self.base_pos)

        self.show()
        
        # Trigger Shake if intense
        if self.intensity > 0:
            self.shake_timer.start(50)
        else:
            self.shake_timer.stop()
            
        # Hide after 5-8 seconds
        QTimer.singleShot(6000, self.hide_overlay)

    def shake_frame(self):
        dx = random.randint(-self.intensity, self.intensity)
        dy = random.randint(-self.intensity, self.intensity)
        self.move(self.base_pos.x() + dx, self.base_pos.y() + dy)

    def hide_overlay(self):
        self.shake_timer.stop()
        self.hide()
