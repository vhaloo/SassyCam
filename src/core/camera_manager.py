import cv2
import threading
import time
import os
from PyQt6.QtGui import QImage, QPixmap
from PyQt6.QtCore import pyqtSignal, QObject

class CameraManager(QObject):
    # No more frame_ready signal for high-frequency updates
    
    def __init__(self, camera_index=0):
        super().__init__()
        self.camera_index = camera_index
        self.cap = None
        self.is_running = False
        self.thread = None
        self.latest_frame = None
        self.lock = threading.Lock()

    def start(self):
        if self.is_running:
            return
        
        print(f"Opening camera {self.camera_index}...")
        # Use default backend as DSHOW might hang
        self.cap = cv2.VideoCapture(self.camera_index)
            
        if not self.cap.isOpened():
            print(f"Error: Could not open camera {self.camera_index}")
            return

        # Attempt to set lower resolution for performance
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        print("Camera thread started.")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join()
        if self.cap:
            self.cap.release()

    def _capture_loop(self):
        print(f"Starting capture loop on camera {self.camera_index}...")
        while self.is_running:
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            with self.lock:
                self.latest_frame = frame.copy()
            
            # Simple limiter to avoid CPU burn
            time.sleep(0.01)

    def get_latest_qimage(self):
        with self.lock:
            if self.latest_frame is None:
                return None
            frame = self.latest_frame.copy()
            
        # Convert to RGB
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_image.shape
        bytes_per_line = ch * w
        # QImage needs to copy the data since rgb_image will be destroyed
        return QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format.Format_RGB888).copy()

    def get_snapshot(self):
        with self.lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy()
        return None
