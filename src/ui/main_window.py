import sys
import threading
import time
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QSlider, QTextEdit, 
                             QDialog, QLineEdit, QFormLayout, QComboBox, QCheckBox)
from PyQt6.QtGui import QPixmap, QImage, QIcon
from PyQt6.QtCore import Qt, QTimer, pyqtSlot

from src.core.camera_manager import CameraManager
from src.core.audio_manager import AudioManager
from src.core.tts_manager import TTSManager
from src.core.ai_manager import AIManager
from src.core.ros_manager import ROSManager
from src.config import ConfigManager
from src.core.auth_manager import AuthManager
from src.core.model_registry import ModelRegistry
from src.ui.login_dialog import LoginDialog
from src.ui.styles import STYLESHEET

import cv2
import numpy as np

class SettingsDialog(QDialog):
    def __init__(self, main_window, parent=None):
        super().__init__(parent)
        self.setWindowTitle("SassyCam Settings")
        self.main_window = main_window
        self.config_manager = main_window.config
        self.auth = main_window.auth
        self.layout = QFormLayout(self)
        
        # Provider Selection
        self.provider_combo = QComboBox()
        self.provider_combo.addItems(ModelRegistry.PROVIDERS)
        self.provider_combo.setCurrentText(self.config_manager.get("provider", "Gemini"))
        self.provider_combo.currentTextChanged.connect(self.update_key_placeholder)
        self.layout.addRow("AI Provider:", self.provider_combo)

        # Model Selection (Dynamic based on provider)
        self.model_combo = QComboBox()
        self.model_combo.setEditable(True)  # Allow custom model names
        self.update_model_list(self.provider_combo.currentText())
        self.provider_combo.currentTextChanged.connect(self.update_model_list)
        self.layout.addRow("Model Version:", self.model_combo)

        # Secure API Key Input
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("Stored securely in Keychain")
        self.layout.addRow("API Key:", self.api_key_input)
        
        self.update_key_placeholder(self.provider_combo.currentText())

        # ... (Rest of existing settings: Camera, Audio, etc.) ...
        # Camera Index (Immediate Change)
        self.camera_index_combo = QComboBox()
        for i in range(5):
            self.camera_index_combo.addItem(f"Camera {i}", i)
        self.camera_index_combo.setCurrentIndex(self.config_manager.get("camera_index"))
        self.camera_index_combo.currentIndexChanged.connect(self.on_camera_changed)
        self.layout.addRow("Camera Index:", self.camera_index_combo)
        
        # Audio Input
        self.audio_input_combo = QComboBox()
        self.audio_input_combo.addItem("Default", None)
        for idx, name in AudioManager.list_input_devices():
            self.audio_input_combo.addItem(name, idx)
        
        current_input = self.config_manager.get("audio_input_device")
        idx = self.audio_input_combo.findData(current_input)
        if idx >= 0: self.audio_input_combo.setCurrentIndex(idx)
        self.layout.addRow("Audio Input:", self.audio_input_combo)

        # Audio Output
        self.audio_output_combo = QComboBox()
        self.audio_output_combo.addItem("Default", None)
        for idx, name in TTSManager.list_output_devices():
            self.audio_output_combo.addItem(name, idx)
        
        current_output = self.config_manager.get("audio_output_device")
        idx = self.audio_output_combo.findData(current_output)
        if idx >= 0: self.audio_output_combo.setCurrentIndex(idx)
        self.layout.addRow("Audio Output:", self.audio_output_combo)

        # Whisper Model
        self.whisper_combo = QComboBox()
        self.whisper_combo.addItems(["tiny", "base", "small", "medium"])
        self.whisper_combo.setCurrentText(self.config_manager.get("whisper_model"))
        self.layout.addRow("Whisper Model:", self.whisper_combo)

        # Language
        self.lang_combo = QComboBox()
        self.lang_combo.addItems(["English", "French", "Japanese", "Korean", "Chinese", "Spanish"])
        self.lang_combo.setCurrentText(self.config_manager.get("language"))
        self.layout.addRow("Response Language:", self.lang_combo)

        # Voice
        self.voice_combo = QComboBox()
        self.voice_combo.addItems(["af_heart", "af_bella", "af_nicole", "af_sarah", "am_adam", "am_michael", "ff_siwis", "jf_alpha", "kf_alpha", "zf_alpha", "ef_alpha"])
        self.voice_combo.setCurrentText(self.config_manager.get("voice_code"))
        self.layout.addRow("Voice:", self.voice_combo)

        # Mic Sensitivity
        mic_layout = QHBoxLayout()
        self.mic_slider = QSlider(Qt.Orientation.Horizontal)
        self.mic_slider.setRange(1, 50)
        self.mic_slider.setValue(int(self.config_manager.get("mic_threshold") * 1000))
        self.mic_label = QLabel(f"{self.mic_slider.value()/1000:.3f}")
        self.mic_slider.valueChanged.connect(lambda v: self.mic_label.setText(f"{v/1000:.3f}"))
        mic_layout.addWidget(self.mic_slider)
        mic_layout.addWidget(self.mic_label)
        self.layout.addRow("Mic Sensitivity:", mic_layout)

        # Auto-Sass Interval
        interval_layout = QHBoxLayout()
        self.interval_slider = QSlider(Qt.Orientation.Horizontal)
        self.interval_slider.setRange(10, 300)
        self.interval_slider.setValue(self.config_manager.get("auto_sass_interval"))
        self.interval_label = QLabel(f"{self.interval_slider.value()}s")
        self.interval_slider.valueChanged.connect(lambda v: self.interval_label.setText(f"{v}s"))
        interval_layout.addWidget(self.interval_slider)
        interval_layout.addWidget(self.interval_label)
        self.layout.addRow("Auto-Sass Interval:", interval_layout)

        # ROS 2 Integration
        self.ros_enabled_cb = QCheckBox("Enable ROS 2 Bridge")
        self.ros_enabled_cb.setChecked(self.config_manager.get("ros_enabled"))
        self.layout.addRow("ROS 2:", self.ros_enabled_cb)

        self.ros_topic_input = QLineEdit(self.config_manager.get("ros_roast_topic"))
        self.layout.addRow("ROS Roast Topic:", self.ros_topic_input)
        
        self.save_btn = QPushButton("Save")
        self.save_btn.clicked.connect(self.save_settings)
        self.layout.addRow(self.save_btn)
        
        self.setStyleSheet(STYLESHEET)

    def update_key_placeholder(self, provider):
        # Check if we have a key stored
        existing_key = self.auth.get_api_key(provider)
        if existing_key:
            self.api_key_input.setPlaceholderText(f"Key for {provider} stored securely.")
        else:
            self.api_key_input.setPlaceholderText(f"Enter API Key for {provider}")

    def update_model_list(self, provider):
        self.model_combo.clear()
        
        models = ModelRegistry.get_models_for_provider(provider)
        for model in models:
            self.model_combo.addItem(model.name, model.id)
            
        current = self.config_manager.get(f"{provider.lower()}_model")
        # Find index for ID
        idx = self.model_combo.findData(current)
        if idx >= 0:
            self.model_combo.setCurrentIndex(idx)
        else:
            self.model_combo.setCurrentText(current)

    def on_camera_changed(self, index):
        new_index = self.camera_index_combo.currentData()
        self.config_manager.set("camera_index", new_index)
        self.main_window.camera.stop()
        self.main_window.camera.camera_index = new_index
        threading.Thread(target=self.main_window.camera.start, daemon=True).start()

    def save_settings(self):
        # Save Provider Config
        provider = self.provider_combo.currentText()
        model_id = self.model_combo.currentData()
        if not model_id: # Custom text entered
            model_id = self.model_combo.currentText()
        
        self.config_manager.set("provider", provider)
        self.config_manager.set(f"{provider.lower()}_model", model_id)
        
        # Save Key securely if entered
        new_key = self.api_key_input.text()
        if new_key:
            self.auth.set_api_key(provider, new_key)
        
        # Refresh AI manager immediately
        self.main_window.ai.load_provider()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        # Initialize Auth First
        self.auth = AuthManager()
        if not self.auth.login("Guest"): # Try default guest login first
             pass 

        # If we want a proper login dialog before showing main window:
        # Note: In PyQt, typically you show login dialog before main window.
        # We will handle this in main execution block below, or here.
        
        self.setWindowTitle("SassyCam v0.0.1")
        self.setMinimumSize(800, 600)
        self.setGeometry(100, 100, 1000, 800)
        
        # Initialize Core Components
        self.config = ConfigManager()
        self.init_ui()
        
        self.camera = CameraManager(self.config.get("camera_index"))
        self.audio = AudioManager(
            model_size=self.config.get("whisper_model"),
            input_device=self.config.get("audio_input_device")
        )
        self.audio.energy_threshold = self.config.get("mic_threshold")
        
        self.tts = TTSManager(
            output_device=self.config.get("audio_output_device"),
            status_callback=self.on_tts_status_change
        )
        
        # AI Manager now takes AuthManager
        self.ai = AIManager(self.auth, self.config)
        self.ai.set_provider(self.config.get("provider", "Gemini"))

        self.ros = ROSManager(
            node_name=self.config.get("ros_node_name"),
            topic=self.config.get("ros_roast_topic")
        )
        if self.config.get("ros_enabled"):
            self.ros.start()
        
        self.is_processing_sass = False
        self.start_systems()

    def on_tts_status_change(self, is_speaking):
        self.audio.set_muted(is_speaking)
        if is_speaking:
            self.statusBar().showMessage("Speaking...")
        else:
            self.statusBar().showMessage("Ready.")

    def init_ui(self):
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)
        
        # Header
        header_layout = QHBoxLayout()
        title = QLabel("SassyCam")
        title.setObjectName("Title")
        
        # Mic Indicator
        self.mic_status = QLabel("●")
        self.mic_status.setStyleSheet("color: #333; font-size: 20px;")
        self.mic_status.setToolTip("Mic Activity")
        
        settings_btn = QPushButton("Settings")
        settings_btn.clicked.connect(self.open_settings)
        header_layout.addWidget(title)
        header_layout.addStretch()
        header_layout.addWidget(self.mic_status)
        header_layout.addWidget(settings_btn)
        self.main_layout.addLayout(header_layout)
        
        # Video Area
        self.video_label = QLabel("Initializing Camera...")
        self.video_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.video_label.setMinimumSize(640, 480)
        self.video_label.setStyleSheet("background-color: #000; border: 2px solid #333;")
        self.main_layout.addWidget(self.video_label, 1)
        
        # Controls Area
        controls_layout = QHBoxLayout()
        
        # Sass Meter
        sass_layout = QVBoxLayout()
        sass_label = QLabel("Sass-O-Meter")
        sass_label.setObjectName("SassLabel")
        self.sass_slider = QSlider(Qt.Orientation.Horizontal)
        self.sass_slider.setRange(0, 100)
        self.sass_slider.setValue(self.config.get("sass_level"))
        self.sass_slider.valueChanged.connect(self.update_sass_level)
        sass_layout.addWidget(sass_label)
        sass_layout.addWidget(self.sass_slider)
        controls_layout.addLayout(sass_layout)
        
        # Manual Trigger
        self.roast_btn = QPushButton("Roast Me Now")
        self.roast_btn.clicked.connect(self.trigger_sass)
        controls_layout.addWidget(self.roast_btn)
        
        self.main_layout.addLayout(controls_layout)
        
        # Log Area
        self.log_area = QTextEdit()
        self.log_area.setReadOnly(True)
        self.log_area.setMaximumHeight(150)
        self.main_layout.addWidget(self.log_area)
        
        # Apply Styles
        self.setStyleSheet(STYLESHEET)

    def start_systems(self):
        threading.Thread(target=self.camera.start, daemon=True).start()
        self.audio.start_listening()

        # Camera polling timer
        self.camera_timer = QTimer()
        self.camera_timer.timeout.connect(self.poll_camera)
        self.camera_timer.start(33)

        # Status checker timer
        self.check_timer = QTimer()
        self.check_timer.timeout.connect(self.check_status)
        self.check_timer.start(100) # Faster check for mic feedback

        # Boredom Timer
        self.last_sass_time = time.time()
        self.boredom_timer = QTimer()
        self.boredom_timer.timeout.connect(self.check_boredom)
        self.boredom_timer.start(1000)

    def poll_camera(self):
        q_img = self.camera.get_latest_qimage()
        if q_img:
            if not hasattr(self, '_first_ui_frame'):
                self.statusBar().showMessage("Camera Feed Active")
                self._first_ui_frame = True
            self.update_video_feed(q_img)

    def update_video_feed(self, q_img):
        pixmap = QPixmap.fromImage(q_img)
        scaled_pixmap = pixmap.scaled(self.video_label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        self.video_label.setPixmap(scaled_pixmap)

    def update_sass_level(self, value):
        self.config.set("sass_level", value)
        self.log(f"Sass Level set to: {value}")

    def open_settings(self):
        dialog = SettingsDialog(self, self)
        if dialog.exec():
            # Apply settings
            self.audio.energy_threshold = self.config.get("mic_threshold")
            self.audio.update_settings(
                model_size=self.config.get("whisper_model"),
                input_device=self.config.get("audio_input_device")
            )
            self.tts.set_output_device(self.config.get("audio_output_device"))
            
            # ROS Update
            if self.config.get("ros_enabled"):
                if not self.ros.enabled:
                    self.ros.topic_name = self.config.get("ros_roast_topic")
                    self.ros.start()
            else:
                if self.ros.enabled:
                    self.ros.stop()
            
            self.log("Settings updated.")

    def log(self, text):
        self.log_area.append(f"[{time.strftime('%H:%M:%S')}] {text}")
        sb = self.log_area.verticalScrollBar()
        sb.setValue(sb.maximum())

    def trigger_sass(self):
        if self.is_processing_sass: return
        self.last_sass_time = time.time()
        threading.Thread(target=self._process_sass_thread, daemon=True).start()

    def check_status(self):
        # Update Mic Dot Color
        energy = self.audio.latest_energy
        if self.audio.is_muted:
            self.mic_status.setStyleSheet("color: #CF6679;")
        elif energy > self.audio.energy_threshold:
            self.mic_status.setStyleSheet("color: #03DAC6;")
        elif energy > self.audio.energy_threshold * 0.5:
            self.mic_status.setStyleSheet("color: #BB86FC;")
        else:
            self.mic_status.setStyleSheet("color: #333;")

        # Whisper Status
        if not self.audio.is_ready:
            self.statusBar().showMessage(f"Loading Whisper ({self.audio.model_size})...")
        elif not self.is_processing_sass and not self.tts.is_playing:
            self.statusBar().showMessage("Listening...")

        # Transcripts
        transcript = self.audio.get_latest_transcript()
        if transcript:
            self.log(f"Heard: '{transcript}'")
            if not self.is_processing_sass:
                self.trigger_sass_with_context(transcript)

    def check_boredom(self):
        if self.is_processing_sass: return
        interval = self.config.get("auto_sass_interval")
        if time.time() - self.last_sass_time > interval:
            self.log("Boredom check triggered...")
            self.trigger_sass_with_context("")

    def trigger_sass_with_context(self, text):
        if self.is_processing_sass: return
        self.last_sass_time = time.time()
        threading.Thread(target=self._process_sass_thread, args=(text,), daemon=True).start()

    def _process_sass_thread(self, user_text=""):
        self.is_processing_sass = True
        self.statusBar().showMessage("Judging you...")
        try:
            frame = self.camera.get_snapshot()
            if frame is None:
                self.log("Error: No camera frame.")
                return
            ret, buffer = cv2.imencode('.jpg', frame)
            image_bytes = buffer.tobytes()
            sass_level = self.config.get("sass_level")
            language = self.config.get("language")
            response = self.ai.generate_sass(image_bytes, user_text, sass_level, language)
            self.log(f"SassyCam: {response}")
            self.ros.publish_roast(response) # ROS Integration
            self.tts.speak(response, self.config.get("voice_code"), language)
        except Exception as e:
            self.log(f"Error: {e}")
        finally:
            self.is_processing_sass = False

    def closeEvent(self, event):
        self.camera.stop()
        self.audio.stop_listening()
        self.tts.stop()
        self.ros.stop()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
