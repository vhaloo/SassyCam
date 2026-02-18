import sounddevice as sd
import numpy as np
import threading
import queue
import whisper
import time
import os

class AudioManager:
    def __init__(self, model_size="tiny", input_device=None):
        self.model_size = model_size
        self.input_device = input_device
        self.model = None
        self.is_listening = False
        self.is_muted = False # True when AI is speaking
        self._is_ready = False
        self.audio_queue = queue.Queue()
        self.transcript_queue = queue.Queue()
        self.energy_threshold = 0.005 # Sensitivity
        self.silence_duration = 1.2
        self.sample_rate = 16000
        self.channels = 1
        self.stream = None
        
        self.is_speaking = False
        self.last_speech_time = 0
        self.latest_energy = 0.0 # For UI feedback
        self.current_buffer = [] # Buffer for speech segments
        
        threading.Thread(target=self._load_model, daemon=True).start()
        threading.Thread(target=self._process_audio_loop, daemon=True).start()

    def _load_model(self):
        print(f"Loading OpenAI Whisper model ({self.model_size})...")
        try:
            self.model = whisper.load_model(self.model_size, device="cpu")
            self.is_ready = True
            print("OpenAI Whisper model loaded.")
        except Exception as e:
            print(f"Error loading OpenAI Whisper: {e}")

    @property
    def is_ready(self):
        return hasattr(self, '_is_ready') and self._is_ready

    @is_ready.setter
    def is_ready(self, value):
        self._is_ready = value

    def update_settings(self, model_size=None, input_device=None):
        restart_needed = False
        if model_size and model_size != self.model_size:
            self.model_size = model_size
            threading.Thread(target=self._load_model, daemon=True).start()
        
        if input_device != self.input_device:
            self.input_device = input_device
            restart_needed = True
            
        if restart_needed and self.is_listening:
            self.stop_listening()
            self.start_listening()

    def set_muted(self, muted):
        self.is_muted = muted
        if muted:
            self.current_buffer = []
            self.is_speaking = False

    def start_listening(self):
        self.is_listening = True
        try:
            self.stream = sd.InputStream(
                device=self.input_device,
                callback=self._audio_callback,
                channels=self.channels,
                samplerate=self.sample_rate,
                dtype="float32"
            )
            self.stream.start()
        except Exception as e:
            print(f"Error starting audio stream: {e}")

    def stop_listening(self):
        self.is_listening = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

    @staticmethod
    def list_input_devices():
        devices = sd.query_devices()
        input_devices = []
        for i, d in enumerate(devices):
            if d['max_input_channels'] > 0:
                input_devices.append((i, d['name']))
        return input_devices

    def _audio_callback(self, indata, frames, time, status):
        if status:
            print(status)
        self.audio_queue.put(indata.copy())

    def _process_audio_loop(self):
        while True:
            try:
                chunk = self.audio_queue.get()
                if self.is_muted or not self.is_listening:
                    continue

                # RMS Energy
                energy = np.sqrt(np.mean(chunk**2))
                self.latest_energy = energy
                
                if energy > self.energy_threshold:
                    if not self.is_speaking:
                        print(f"Hearing something... (Energy: {energy:.4f})")
                    self.is_speaking = True
                    self.last_speech_time = time.time()
                    self.current_buffer.append(chunk)
                else:
                    if self.is_speaking:
                        self.current_buffer.append(chunk)
                        if time.time() - self.last_speech_time > self.silence_duration:
                            print("Silence detected, transcribing...")
                            self.is_speaking = False
                            audio_data = np.concatenate(self.current_buffer, axis=0)
                            self.current_buffer = []
                            if len(audio_data) > self.sample_rate * 0.4:
                                self._transcribe(audio_data)
            except Exception as e:
                print(f"Error in audio processing: {e}")

    def _transcribe(self, audio_data):
        if not self.model:
            return
            
        audio_data = audio_data.flatten()
        
        try:
            result = self.model.transcribe(audio_data, fp16=False)
            text = result.get("text", "").strip()
            if text:
                print(f"User said: {text}")
                self.transcript_queue.put(text)
        except Exception as e:
            print(f"Transcription error: {e}")

    def get_latest_transcript(self):
        try:
            return self.transcript_queue.get_nowait()
        except queue.Empty:
            return None
