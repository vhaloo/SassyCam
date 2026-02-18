import os
import requests
import sounddevice as sd
import soundfile as sf
import numpy as np
from kokoro_onnx import Kokoro
import threading
import queue

from src.core.resource_manager import ResourceManager

class TTSManager:
    def __init__(self, assets_dir="assets", output_device=None, status_callback=None):
        self.assets_dir = ResourceManager.get_path(assets_dir)
        self.output_device = output_device
        self.status_callback = status_callback 
        self.model_path = os.path.join(self.assets_dir, "kokoro-v1.0.onnx")
        self.voices_path = os.path.join(self.assets_dir, "voices-v1.0.bin")
        self.kokoro = None
        self.audio_queue = queue.Queue()
        self.is_playing = False
        self.lock = threading.Lock()
        
        # Ensure assets directory exists (only if not frozen/compiled, or handle in appdata)
        # For compiled app, we might want to use a user data dir instead of local
        if not os.path.exists(self.assets_dir):
            try:
                os.makedirs(self.assets_dir)
            except OSError:
                pass # Might be read-only in Program Files

        # Initialize in a separate thread to not block UI
        threading.Thread(target=self._initialize_model, daemon=True).start()
        
        # Start audio player thread
        threading.Thread(target=self._audio_player_loop, daemon=True).start()

    def _initialize_model(self):
        self._ensure_model_exists()
        try:
            print("Loading Kokoro model...")
            self.kokoro = Kokoro(self.model_path, self.voices_path)
            print("Kokoro model loaded successfully.")
        except Exception as e:
            print(f"Failed to load Kokoro model: {e}")

    def _ensure_model_exists(self):
        model_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
        voices_url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

        if not os.path.exists(self.model_path):
            print(f"Downloading Kokoro model to {self.model_path}...")
            self._download_file(model_url, self.model_path)

        if not os.path.exists(self.voices_path):
            print(f"Downloading Voices file to {self.voices_path}...")
            self._download_file(voices_url, self.voices_path)

    def _download_file(self, url, dest):
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"Downloaded {dest}")
        except Exception as e:
            print(f"Error downloading {url}: {e}")
            if os.path.exists(dest):
                os.remove(dest) # Remove partial file

    LANG_MAP = {
        "English": {"code": "en-us", "default_voice": "af_heart"},
        "French": {"code": "fr-fr", "default_voice": "ff_siwis"},
        "Japanese": {"code": "ja-jp", "default_voice": "jf_alpha"},
        "Korean": {"code": "ko-kr", "default_voice": "kf_alpha"},
        "Chinese": {"code": "zh-cn", "default_voice": "zf_alpha"},
        "Spanish": {"code": "es-es", "default_voice": "ef_alpha"}
    }

    def speak(self, text, voice="af_heart", language="English"):
        if not self.kokoro:
            print("TTS model not loaded yet.")
            return

        lang_cfg = self.LANG_MAP.get(language, self.LANG_MAP["English"])
        lang_code = lang_cfg["code"]
        
        # If the voice doesn't match the language prefix (e.g. 'af' for 'en-us'), 
        # use the default voice for that language to avoid errors.
        if not voice.startswith(lang_code[0]):
            voice = lang_cfg["default_voice"]

        print(f"Generating {language} speech for: {text}")
        try:
            samples, sample_rate = self.kokoro.create(text, voice=voice, speed=1.0, lang=lang_code)
            if samples is not None:
                self.audio_queue.put((samples, sample_rate))
        except Exception as e:
            print(f"Error generating speech: {e}")

    def _audio_player_loop(self):
        while True:
            samples, sample_rate = self.audio_queue.get()
            self.is_playing = True
            if self.status_callback:
                self.status_callback(True)
            try:
                sd.play(samples, sample_rate, device=self.output_device)
                sd.wait()
            except Exception as e:
                print(f"Error playing audio: {e}")
            finally:
                self.is_playing = False
                if self.status_callback:
                    self.status_callback(False)
                self.audio_queue.task_done()

    def set_output_device(self, device_index):
        self.output_device = device_index

    @staticmethod
    def list_output_devices():
        devices = sd.query_devices()
        output_devices = []
        for i, d in enumerate(devices):
            if d['max_output_channels'] > 0:
                output_devices.append((i, d['name']))
        return output_devices

    def stop(self):
        sd.stop()
        with self.audio_queue.mutex:
            self.audio_queue.queue.clear()
