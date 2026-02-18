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
        
        # Binary name varies by platform
        ffmpeg_bin = "ffmpeg.exe" if os.name == 'nt' else "ffmpeg"
        
        # Check system PATH first
        if shutil.which("ffmpeg"):
            return "ffmpeg"

        # Check local bin folder
        local_ffmpeg = os.path.join(os.path.abspath(target_dir), ffmpeg_bin)
        if os.path.exists(local_ffmpeg):
            # Add to PATH for this process
            os.environ["PATH"] += os.pathsep + os.path.abspath(target_dir)
            return local_ffmpeg

        print(f"FFmpeg not found. Downloading static build for {sys.platform}...")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        # URLs for static builds
        if os.name == 'nt':
            url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
            ext = ".zip"
        elif sys.platform == 'darwin':
            url = "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip" # macOS zip
            ext = ".zip"
        else: # Linux
            url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-i686-static.tar.xz"
            ext = ".tar.xz"

        archive_path = os.path.join(target_dir, f"ffmpeg{ext}")

        try:
            # Download
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(archive_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            # Extract
            print(f"Extracting FFmpeg from {ext}...")
            if ext == ".zip":
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    for file in zip_ref.namelist():
                        if file.endswith(ffmpeg_bin):
                            with zip_ref.open(file) as source, open(local_ffmpeg, "wb") as target:
                                shutil.copyfileobj(source, target)
                            break
            else: # .tar.xz
                import tarfile
                with tarfile.open(archive_path, "r:xz") as tar:
                    for member in tar.getmembers():
                        if member.name.endswith(ffmpeg_bin):
                            member.name = os.path.basename(member.name)
                            tar.extract(member, path=target_dir)
                            break
            
            # Make executable on Unix
            if os.name != 'nt':
                os.chmod(local_ffmpeg, 0o755)

            # Cleanup
            os.remove(archive_path)
            
            # Add to PATH
            os.environ["PATH"] += os.pathsep + os.path.abspath(target_dir)
            print("FFmpeg setup complete.")
            return local_ffmpeg

        except Exception as e:
            print(f"Failed to setup FFmpeg: {e}")
            return None
