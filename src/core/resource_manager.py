import sys
import os
import shutil
import zipfile
import requests
import subprocess

class ResourceManager:
    @staticmethod
    def get_path(relative_path):
        """ Get absolute path to resource, works for dev and for PyInstaller """
        try:
            # PyInstaller creates a temp folder and stores path in _MEIPASS
            base_path = sys._MEIPASS
        except Exception:
            base_path = os.path.abspath(".")

        return os.path.join(base_path, relative_path)

    @staticmethod
    def ensure_ffmpeg(target_dir="bin"):
        """ Checks for FFmpeg and downloads it if missing. Returns path to bin. """
        
        # Check system PATH first
        if shutil.which("ffmpeg"):
            return "ffmpeg"

        # Check local bin folder
        local_ffmpeg = os.path.join(os.path.abspath(target_dir), "ffmpeg.exe")
        if os.path.exists(local_ffmpeg):
            # Add to PATH for this process
            os.environ["PATH"] += os.pathsep + os.path.abspath(target_dir)
            return local_ffmpeg

        print("FFmpeg not found. Downloading static build (this may take a moment)...")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        # URL for Gyan.dev FFmpeg release (Essentials build)
        url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
        zip_path = os.path.join(target_dir, "ffmpeg.zip")

        try:
            # Download
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(zip_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            # Extract
            print("Extracting FFmpeg...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # Find the bin/ffmpeg.exe in the zip
                for file in zip_ref.namelist():
                    if file.endswith("ffmpeg.exe"):
                        source = zip_ref.open(file)
                        target = open(local_ffmpeg, "wb")
                        shutil.copyfileobj(source, target)
                        source.close()
                        target.close()
                        break
            
            # Cleanup
            os.remove(zip_path)
            
            # Add to PATH
            os.environ["PATH"] += os.pathsep + os.path.abspath(target_dir)
            print("FFmpeg setup complete.")
            return local_ffmpeg

        except Exception as e:
            print(f"Failed to setup FFmpeg: {e}")
            return None
