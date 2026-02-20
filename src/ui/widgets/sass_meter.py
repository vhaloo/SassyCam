from PyQt6.QtWidgets import QWidget
from PyQt6.QtCore import pyqtSignal, Qt, QTimer, QRectF
from PyQt6.QtGui import QPainter, QBrush, QColor, QPen, QFont, QLinearGradient, QConicalGradient

class SassMeter(QWidget):
    valueChanged = pyqtSignal(int)

    def __init__(self, parent=None, initial_value=50):
        super().__init__(parent)
        self.setMinimumSize(300, 80)
        self._value = initial_value
        self._target_value = initial_value
        self.hover_value = -1
        self.is_dragging = False
        self.audio_energy = 0.0 # New: Audio reactivity
        
        # Animation timer for smooth transition and pulse
        self.anim_timer = QTimer(self)
        self.anim_timer.timeout.connect(self.update_animation)
        self.anim_timer.start(16) # ~60 FPS
        
        self.pulse_alpha = 0
        self.pulse_direction = 1

    def set_audio_energy(self, energy):
        """Updates the visual audio reactivity (0.0 to 1.0 usually)"""
        # Smooth decay or instant attack
        self.audio_energy = energy * 50.0 # Scale up for visual impact
        # Cap it
        if self.audio_energy > 20: self.audio_energy = 20

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, v):
        self._target_value = max(0, min(100, v))
        self.valueChanged.emit(self._target_value)

    def update_animation(self):
        # Smooth value interpolation
        diff = self._target_value - self._value
        if abs(diff) > 0.5:
            self._value += diff * 0.1
        else:
            self._value = self._target_value
            
        # Pulse effect for high sass
        if self._value > 75:
            speed = 5 + (self._value - 75) // 2
            self.pulse_alpha += self.pulse_direction * speed
            if self.pulse_alpha >= 255:
                self.pulse_alpha = 255
                self.pulse_direction = -1
            elif self.pulse_alpha <= 50:
                self.pulse_alpha = 50
                self.pulse_direction = 1
        else:
            self.pulse_alpha = 0
            
        self.update()

    def get_color(self, value):
        # Cyberpunk Gradient Logic - More vivid
        if value < 25: return QColor(0, 255, 200)   # Cyan (Mild)
        if value < 50: return QColor(255, 200, 0)   # Yellow (Sassy)
        if value < 80: return QColor(255, 100, 0)   # Orange (Ruthless)
        if value < 95: return QColor(255, 0, 0)     # Red (Destruction)
        return QColor(180, 0, 255)                  # Purple/Pink (NUCLEAR)

    def get_text(self):
        v = self._target_value
        if v < 25: return "MILD"
        if v < 50: return "SASSY"
        if v < 80: return "RUTHLESS"
        if v < 95: return "SAVAGE"
        if v >= 95: return "EMOTIONAL DAMAGE" # New Label
        return "NUCLEAR"

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        w = self.width()
        h = self.height()
        
        # Background (Dark Tech Container)
        bg_rect = QRectF(10, 20, w-20, h-40)
        painter.setBrush(QColor(10, 10, 20))
        
        # Flash background at high levels
        if self._value > 90 and (self.pulse_alpha > 200):
            painter.setBrush(QColor(50, 0, 0)) # Red alert flash
            
        painter.setPen(QPen(QColor(60, 60, 80), 2))
        painter.drawRoundedRect(bg_rect, 5, 5)
        
        # Grid lines
        painter.setPen(QPen(QColor(40, 40, 50), 1))
        for i in range(10):
            x = 10 + (w-20) * (i/10)
            painter.drawLine(int(x), 20, int(x), h-20)

        # Active Bar
        bar_width = (w - 24) * (self._value / 100)
        bar_rect = QRectF(12, 22, bar_width, h-44)
        
        base_color = self.get_color(self._value)
        
        # Gradient Fill
        grad = QLinearGradient(12, 0, w, 0)
        grad.setColorAt(0, QColor(0, 255, 255, 100)) # Cool start
        grad.setColorAt(0.5, base_color)             # Transition
        grad.setColorAt(1, base_color.lighter(120))  # Hot tip
        
        painter.setBrush(grad)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(bar_rect, 3, 3)
        
        # Glitch/Pulse Overlay (High levels)
        if self._value > 75:
            glow_color = base_color
            glow_color.setAlpha(int(self.pulse_alpha))
            painter.setBrush(glow_color)
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_Overlay)
            painter.drawRoundedRect(bar_rect, 3, 3)
            painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)

        # Slider Handle (The "Blade")
        handle_x = 12 + bar_width
        painter.setPen(QPen(QColor(255, 255, 255), 3))
        painter.drawLine(int(handle_x), 15, int(handle_x), h-15)
        
        # Text Logic
        text = f"{self.get_text()} [{int(self._value)}%]"
        
        # Font size scales with sass
        font_size = 12 + int((self._value / 100) * 8) 
        font = QFont("Segoe UI", font_size, QFont.Weight.Bold)
        painter.setFont(font)
        
        # Shake effect logic
        shake_x = 0
        shake_y = 0
        if self._value > 80:
            import random
            intensity = (self._value - 80) / 4 # 0 to 5px shake
            shake_x = random.uniform(-intensity, intensity)
            shake_y = random.uniform(-intensity, intensity)

        # Draw Text Shadow
        painter.setPen(QColor(0, 0, 0))
        painter.drawText(QRectF(shake_x + 2, shake_y + 2, w, h), Qt.AlignmentFlag.AlignCenter, text)
        
        # Draw Main Text
        if self._value >= 98:
             painter.setPen(QColor(255, 0, 0)) # Red text for max danger
        else:
             painter.setPen(QColor(255, 255, 255))
             
        painter.drawText(QRectF(shake_x, shake_y, w, h), Qt.AlignmentFlag.AlignCenter, text)

    def mousePressEvent(self, event):
        self.is_dragging = True
        self.update_value_from_mouse(event.pos().x())

    def mouseMoveEvent(self, event):
        if self.is_dragging:
            self.update_value_from_mouse(event.pos().x())

    def mouseReleaseEvent(self, event):
        self.is_dragging = False

    def update_value_from_mouse(self, x):
        w = self.width()
        # Constrain to bar area
        rel_x = max(12, min(x, w - 12)) - 12
        avail_w = w - 24
        
        new_val = int((rel_x / avail_w) * 100)
        self.value = new_val
