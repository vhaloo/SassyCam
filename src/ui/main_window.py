import sys
import threading
import time
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QPushButton, QSlider, QTextEdit, 
                             QDialog, QLineEdit, QFormLayout, QComboBox, QCheckBox, 
                             QProgressBar, QScrollArea)
from PyQt6.QtGui import QPixmap, QImage, QIcon
from PyQt6.QtCore import Qt, QTimer, pyqtSlot, pyqtSignal

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
from src.ui.widgets.sass_meter import SassMeter
from src.ui.widgets.splash import SplashWidget
from src.ui.widgets.overlay import OverlayWidget

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

        from src.version import __version__
        version_label = QLabel(f"SassyCam v{__version__} - Powered by Gemini 3.1 Flash")
        version_label.setStyleSheet("color: #888; font-size: 10px; margin-bottom: 10px;")
        self.layout.addRow(version_label)
        
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

class ClickableLabel(QLabel):
    doubleClicked = pyqtSignal(str)
    clicked = pyqtSignal(str)
    
    def __init__(self, image_path="", parent=None):
        super().__init__(parent)
        self.image_path = image_path
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        
    def mouseDoubleClickEvent(self, event):
        if self.image_path:
            self.doubleClicked.emit(self.image_path)

    def mousePressEvent(self, event):
        if self.image_path and event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self.image_path)
        super().mousePressEvent(event)

class MainWindow(QMainWindow):
    sass_generated = pyqtSignal(str, int) # Signal: Text, SassLevel
    tts_status_changed = pyqtSignal(bool, str, int) # Signal: is_speaking, text, sass_level
    caricature_generated = pyqtSignal(str) # Signal: image_path
    processing_state_changed = pyqtSignal(bool) # Signal: is_processing

    def __init__(self):
        super().__init__()
        
        # Initialize Auth First
        self.auth = AuthManager()
        if not self.auth.login("Guest"): # Try default guest login first
             pass 

        # Splash Screen
        self.splash = SplashWidget()
        self.splash.show()
        
        self.setWindowTitle("SassyCam v0.1.0")
        self.setMinimumSize(900, 700)
        self.setGeometry(100, 100, 1200, 900)
        
        # Initialize Core Components
        self.config = ConfigManager()
        self.init_ui()
        
        # Connect Signal
        self.sass_generated.connect(self.on_sass_generated)
        self.tts_status_changed.connect(self.handle_tts_status)
        self.caricature_generated.connect(self.on_caricature_generated)
        self.processing_state_changed.connect(self.handle_processing_state)

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
        self.is_processing_caricature = False
        self.last_sass_text = "Just relaxing in front of the camera."
        self.last_image_bytes = None
        self.last_caricature_path = ""
        self.start_systems()
        QTimer.singleShot(500, self.load_history) # Load history after systems start

    def on_tts_status_change(self, is_speaking, text="", sass_level=0):
        self.tts_status_changed.emit(is_speaking, text, sass_level)

    @pyqtSlot(bool, str, int)
    def handle_tts_status(self, is_speaking, text, sass_level):
        self.audio.set_muted(is_speaking)
        if is_speaking:
            self.statusBar().showMessage("Speaking...")
            if hasattr(self, 'overlay'):
                self.overlay.show_sass(text, sass_level)
        else:
            self.statusBar().showMessage("Ready.")
            if hasattr(self, 'overlay') and self.overlay.isVisible():
                self.overlay.hide_overlay()

    @pyqtSlot(bool)
    def handle_processing_state(self, is_processing):
        if is_processing:
            self.progress_bar.show()
            self.progress_bar.setRange(0, 0) # Indeterminate loading
        else:
            self.progress_bar.hide()
            self.progress_bar.setRange(0, 100)

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
        
        # Central Horizontal Area (Camera + Main Image)
        content_layout = QHBoxLayout()
        
        # Left: Camera Feed
        self.video_label = QLabel("Initializing Camera...")
        self.video_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.video_label.setFixedSize(320, 240) # Smaller fixed size for camera now
        self.video_label.setStyleSheet("background-color: #000; border: 2px solid #333;")
        content_layout.addWidget(self.video_label, 0, Qt.AlignmentFlag.AlignTop)

        # Center: Large Adaptive Image View
        self.main_image_label = ClickableLabel()
        self.main_image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.main_image_label.setText("Your Caricature Will Appear Here")
        self.main_image_label.setStyleSheet("background-color: #111; border: 2px solid #555; font-size: 18px; color: #888;")
        self.main_image_label.doubleClicked.connect(self.open_image_externally)
        content_layout.addWidget(self.main_image_label, 1)
        
        self.main_layout.addLayout(content_layout, 1)

        # Progress Bar (Between main view and gallery)
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setFixedHeight(4)
        self.progress_bar.hide()
        self.main_layout.addWidget(self.progress_bar)

        # History Gallery (Scroll Area)
        self.history_label = QLabel("History")
        self.history_label.setStyleSheet("font-weight: bold; color: #aaa; margin-top: 10px;")
        self.main_layout.addWidget(self.history_label)

        self.caricature_scroll = QScrollArea()
        self.caricature_scroll.setWidgetResizable(True)
        self.caricature_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.caricature_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.caricature_scroll.setFixedHeight(120)
        self.caricature_scroll.setStyleSheet("background-color: #0a0a0a; border: none;")
        
        self.caricature_container = QWidget()
        self.caricature_gallery_layout = QHBoxLayout(self.caricature_container)
        self.caricature_gallery_layout.setContentsMargins(5, 5, 5, 5)
        self.caricature_gallery_layout.setSpacing(10)
        self.caricature_gallery_layout.addStretch() 
        
        self.caricature_scroll.setWidget(self.caricature_container)
        self.main_layout.addWidget(self.caricature_scroll)

        # Overlay (Subtitle) - Parented to main_image_label for bottom alignment
        self.overlay = OverlayWidget(self.main_image_label)
        
        # Controls Area
        controls_layout = QHBoxLayout()
        
        # Sass Meter
        self.sass_slider = SassMeter(initial_value=self.config.get("sass_level"))
        self.sass_slider.valueChanged.connect(self.update_sass_level)
        controls_layout.addWidget(self.sass_slider, 1)
        
        # Manual Trigger
        self.roast_btn = QPushButton("Roast Me Now")
        self.roast_btn.clicked.connect(self.trigger_sass)
        controls_layout.addWidget(self.roast_btn)
        
        # Caricature Trigger
        self.caricature_btn = QPushButton("Generate Caricature")
        self.caricature_btn.clicked.connect(self.trigger_caricature)
        controls_layout.addWidget(self.caricature_btn)

        # Open Folder
        self.folder_btn = QPushButton("Open Folder")
        self.folder_btn.clicked.connect(self.open_caricature_folder)
        controls_layout.addWidget(self.folder_btn)

        # About Button
        self.about_btn = QPushButton("?")
        self.about_btn.setFixedWidth(30)
        self.about_btn.setToolTip("About SassyCam")
        self.about_btn.clicked.connect(self.open_about)
        controls_layout.addWidget(self.about_btn)
        
        self.main_layout.addLayout(controls_layout)
        
        # Log Area (Minimized)
        self.log_area = QTextEdit()
        self.log_area.setReadOnly(True)
        self.log_area.setMaximumHeight(60)
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
                # Close splash when camera is ready
                if hasattr(self, 'splash'):
                    self.splash.finish()
            self.update_video_feed(q_img)

    def update_video_feed(self, q_img):
        pixmap = QPixmap.fromImage(q_img)
        scaled_pixmap = pixmap.scaled(self.video_label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        self.video_label.setPixmap(scaled_pixmap)

    def update_sass_level(self, value):
        self.config.set("sass_level", value)
        # Verbose Log for significant changes (every 10%)
        if value % 10 == 0:
             self.log(f"VERBOSE: Sass Level adjusted to {value}%")

    def open_settings(self):
        self.log("VERBOSE: Opening Settings Dialog...")
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
            
            self.log("VERBOSE: Settings applied and saved.")

    def log(self, text):
        self.log_area.append(f"[{time.strftime('%H:%M:%S')}] {text}")
        sb = self.log_area.verticalScrollBar()
        sb.setValue(sb.maximum())

    def trigger_sass(self):
        if self.is_processing_sass: 
            self.log("VERBOSE: Roast ignored (Already processing).")
            return
        self.log("VERBOSE: Manual roast trigger activated.")
        self.last_sass_time = time.time()
        threading.Thread(target=self._process_sass_thread, daemon=True).start()

    def trigger_caricature(self):
        if self.is_processing_caricature:
            self.log("VERBOSE: Caricature generation already in progress.")
            return
        self.log("VERBOSE: Triggering manual caricature generation.")
        threading.Thread(target=self._process_caricature_thread, daemon=True).start()

    def _process_caricature_thread(self):
        self.is_processing_caricature = True
        self.processing_state_changed.emit(True)
        try:
            sass_level = self.config.get("sass_level")
            self.log("VERBOSE: Generating caricature via API...")
            image_path = self.ai.generate_caricature(sass_level, self.last_sass_text, self.last_image_bytes)
            if image_path:
                self.caricature_generated.emit(image_path)
        except Exception as e:
            self.log(f"Error in caricature thread: {e}")
        finally:
            self.is_processing_caricature = False
            self.processing_state_changed.emit(False)

    def check_status(self):
        try:
            # Update Mic Dot Color & Sass Meter Reactivity
            energy = self.audio.latest_energy
            normalized_energy = min(1.0, energy / self.audio.energy_threshold) if self.audio.energy_threshold > 0 else 0
            self.sass_slider.set_audio_energy(normalized_energy)
            
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
            result = self.audio.get_latest_transcript()
            if result:
                transcript, detected_lang_code = result
                self.log(f"Heard ({detected_lang_code}): '{transcript}'")
                
                # Auto-Switch Language Logic
                lang_map = {
                    "en": "English",
                    "fr": "French",
                    "ja": "Japanese",
                    "ko": "Korean",
                    "zh": "Chinese",
                    "es": "Spanish"
                }
                
                detected_lang_name = lang_map.get(detected_lang_code)
                current_lang_name = self.config.get("language")
                
                self.log(f"DEBUG: Detected '{detected_lang_code}' -> '{detected_lang_name}'. Current: '{current_lang_name}'")

                if detected_lang_name and detected_lang_name != current_lang_name:
                    self.log(f"VERBOSE: Switching language to {detected_lang_name}...")
                    self.config.set("language", detected_lang_name)
                    
                    # Auto-switch voice to default for that language
                    voice_defaults = {
                        "English": "af_heart",
                        "French": "ff_siwis",
                        "Japanese": "jf_alpha",
                        "Korean": "kf_alpha", 
                        "Chinese": "zf_alpha",
                        "Spanish": "ef_alpha"
                    }
                    new_voice = voice_defaults.get(detected_lang_name, "af_heart")
                    self.config.set("voice_code", new_voice)
                    self.log(f"VERBOSE: Switched voice to {new_voice}")

                if not self.is_processing_sass:
                    self.trigger_sass_with_context(transcript)
        except Exception as e:
            self.log(f"CRITICAL UI ERROR: {e}")
            print(f"CRITICAL UI ERROR: {e}")

    def check_boredom(self):
        if self.is_processing_sass: return
        interval = self.config.get("auto_sass_interval")
        if time.time() - self.last_sass_time > interval:
            self.log("VERBOSE: Boredom threshold reached. Initiating roast.")
            self.trigger_sass_with_context("")

    def trigger_sass_with_context(self, text):
        if self.is_processing_sass: return
        self.last_sass_time = time.time()
        self.log(f"VERBOSE: Triggering roast with context: '{text}'")
        threading.Thread(target=self._process_sass_thread, args=(text,), daemon=True).start()

    def _process_sass_thread(self, user_text=""):
        self.is_processing_sass = True
        self.statusBar().showMessage("Judging you...")
        try:
            frame = self.camera.get_snapshot()
            if frame is None:
                self.log("Error: No camera frame captured.")
                return
            
            # Log analysis start
            sass_level = self.config.get("sass_level")
            language = self.config.get("language")
            self.log(f"VERBOSE: Analyzing frame. Sass: {sass_level}, Lang: {language}")

            ret, buffer = cv2.imencode('.jpg', frame)
            image_bytes = buffer.tobytes()
            self.last_image_bytes = image_bytes
            
            response = self.ai.generate_sass(image_bytes, user_text, sass_level, language)
            self.last_sass_text = response
            
            self.log(f"SassyCam: {response}")
            self.ros.publish_roast(response) # ROS Integration
            
            # Emit signal for UI updates (Main Thread)
            self.sass_generated.emit(response, sass_level)

            # Trigger caricature concurrently
            if not self.is_processing_caricature:
                threading.Thread(target=self._process_caricature_thread, daemon=True).start()
            
        except Exception as e:
            self.log(f"Error in processing thread: {e}")
        finally:
            self.is_processing_sass = False

    @pyqtSlot(str)
    def on_caricature_generated(self, image_path):
        self.log(f"Caricature saved at: {image_path}")
        self.last_caricature_path = image_path
        self.update_main_image(image_path)
        self._add_to_gallery(image_path)

    def _add_to_gallery(self, image_path):
        # Add thumbnail to horizontal gallery
        pixmap = QPixmap(image_path)
        if not pixmap.isNull():
            thumb_label = ClickableLabel(image_path)
            thumb_label.setFixedSize(100, 100)
            scaled = pixmap.scaled(thumb_label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            thumb_label.setPixmap(scaled)
            thumb_label.setStyleSheet("border: 1px solid #444; background-color: #000;")
            thumb_label.doubleClicked.connect(self.open_image_externally)
            thumb_label.clicked.connect(self.on_gallery_item_clicked)
            
            # Insert at front (after stretch if we had one, but we use insertWidget(0))
            self.caricature_gallery_layout.insertWidget(0, thumb_label)
            self.caricature_scroll.horizontalScrollBar().setValue(0)

    def on_gallery_item_clicked(self, image_path):
        self.log(f"Selected image from gallery: {image_path}")
        self.last_caricature_path = image_path
        self.update_main_image(image_path)

    def load_history(self):
        import glob
        path = os.path.join(os.path.expanduser("~"), "nanobanana-output")
        if not os.path.exists(path):
            return
            
        # Get all images, sorted by creation time
        files = glob.glob(os.path.join(path, "caricature_*.png"))
        files.sort(key=os.path.getctime) # Oldest to newest
        
        for f in files:
            self._add_to_gallery(f)
            
        if files:
            self.last_caricature_path = files[-1]
            self.update_main_image(self.last_caricature_path)

    def update_main_image(self, image_path):
        pixmap = QPixmap(image_path)
        if not pixmap.isNull():
            self.main_image_label.image_path = image_path
            # Adapt to viewport size
            scaled = pixmap.scaled(self.main_image_label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            self.main_image_label.setPixmap(scaled)

    def open_image_externally(self, image_path):
        import subprocess
        import platform
        try:
            if platform.system() == "Windows":
                os.startfile(image_path)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", image_path])
            else:
                subprocess.Popen(["xdg-open", image_path])
        except Exception as e:
            self.log(f"Error opening image: {e}")

    def open_caricature_folder(self):
        import subprocess
        import platform
        path = os.path.join(os.path.expanduser("~"), "nanobanana-output")
        if not os.path.exists(path):
            os.makedirs(path)
            
        try:
            if platform.system() == "Windows":
                os.startfile(path)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception as e:
            self.log(f"Error opening folder: {e}")

    def open_about(self):
        from src.version import __version__
        from PyQt6.QtWidgets import QMessageBox
        msg = QMessageBox(self)
        msg.setWindowTitle("About SassyCam")
        msg.setText(f"<h3>SassyCam v{__version__}</h3>"
                    f"<p>The sentient webcam companion that roasts or adores you.</p>"
                    f"<p>Powered by the <b>latest Gemini 3.1 Flash (Nano Banana 2)</b> for enhanced "
                    f"multimodal capabilities and superior performance.</p>"
                    f"<p>Built with 🔥 by <b>Vhaloo</b>.</p>")
        msg.setIcon(QMessageBox.Icon.Information)
        msg.exec()

    @pyqtSlot(str, int)
    def on_sass_generated(self, text, sass_level):
        language = self.config.get("language")
        self.log("VERBOSE: Sending to TTS...")
        self.tts.speak(text, self.config.get("voice_code"), language, sass_level)

    def resizeEvent(self, event):
        # Update main image scale on resize
        if hasattr(self, 'last_caricature_path') and self.last_caricature_path:
            self.update_main_image(self.last_caricature_path)
            
        # Reposition overlay within main_image_label
        if hasattr(self, 'overlay') and self.overlay.isVisible():
            # Re-trigger styling and positioning logic
            self.overlay.show_sass(self.overlay.text(), self.config.get("sass_level"))
            
        super().resizeEvent(event)

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
