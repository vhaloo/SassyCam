import os
import requests
import sounddevice as sd
import soundfile as sf
import numpy as np
from kokoro_onnx import Kokoro
import threading
import queue

class TTSManager:
    def __init__(self, assets_dir="assets", output_device=None, status_callback=None):
        self.assets_dir = assets_dir
        self.output_device = output_device
        self.status_callback = status_callback # Function taking (bool)
        self.model_path = os.path.join(assets_dir, "kokoro-v1.0.onnx")
        self.voices_path = os.path.join(assets_dir, "voices-v1.0.bin")
        self.kokoro = None
        self.audio_queue = queue.Queue()
        self.is_playing = False
        self.lock = threading.Lock()
        
        # Ensure assets directory exists
        if not os.path.exists(self.assets_dir):
            os.makedirs(self.assets_dir)

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

    def speak(self, text, voice="af_heart"):
        if not self.kokoro:
            print("TTS model not loaded yet.")
            return

        print(f"Generating speech for: {text}")
        try:
            # Generate audio
            # Kokoro create returns (samples, sample_rate)
            samples, sample_rate = self.kokoro.create(text, voice=voice, speed=1.0, lang="en-us")
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
