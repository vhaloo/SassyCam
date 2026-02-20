import sys
import os
import ctypes
import glob

def setup_environment():
    """Configures the environment and explicitly pre-loads DLLs."""
    print("--- Diagnostic DLL Loader ---")
    
    # 1. Determine Paths
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
        internal_dir = os.path.join(base_dir, '_internal')
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        internal_dir = base_dir

    # Search paths order
    search_paths = [
        base_dir,                                         # App Root
        internal_dir,                                     # _internal
        os.path.join(internal_dir, 'torch'),              # _internal/torch (where we put DLLs)
        os.path.join(internal_dir, 'torch', 'lib'),       # _internal/torch/lib
        os.path.join(base_dir, 'torch', 'lib'),
    ]

    # 2. Add to PATH and OS DLL Directory
    current_path = os.environ.get('PATH', '')
    for path in search_paths:
        if os.path.exists(path):
            # print(f"Adding to PATH: {path}")
            os.environ['PATH'] = path + os.pathsep + current_path
            try:
                os.add_dll_directory(path)
            except Exception:
                pass

    # 3. List of Critical DLLs in Dependency Order (Roughly)
    # tbb -> libiomp5 -> c10 -> torch_cpu -> torch_python -> _C
    critical_dlls = [
        'tbb12.dll',
        'libiomp5md.dll', 
        'msvcp140.dll', 
        'concrt140.dll', 
        'vcomp140.dll',
        'c10.dll',
        'torch_cpu.dll',
        'torch.dll',
        'torch_python.dll'
    ]

    # 4. Attempt Load
    for dll_name in critical_dlls:
        found_path = None
        # Find it first
        for search_p in search_paths:
            candidate = os.path.join(search_p, dll_name)
            if os.path.exists(candidate):
                found_path = candidate
                break
        
        if found_path:
            try:
                ctypes.CDLL(found_path)
                print(f"SUCCESS: Loaded {dll_name}")
            except OSError as e:
                print(f"FAILURE: Found {dll_name} at {found_path} but failed to load. Error: {e}")
                # If we fail to load a core DLL, we know why the app will crash later.
        else:
            # Not found is okay for some (like vcomp) if not needed, but bad for c10/torch.
            pass # print(f"WARNING: {dll_name} not found in search paths.")

    print("--- End Diagnostic ---")

# Run setup
setup_environment()

# Imports
try:
    import torch
    print("Import torch: SUCCESS")
    import whisper
    print("Import whisper: SUCCESS")
except ImportError as e:
    print(f"CRITICAL IMPORT ERROR: {e}")
    # Don't exit, let it crash naturally so we see the traceback in context
except Exception as e:
    print(f"CRITICAL ERROR: {e}")

from PyQt6.QtWidgets import QApplication
from src.ui.main_window import MainWindow
from src.core.resource_manager import ResourceManager
from src.version import __version__

def main():
    print(f"Starting SassyCam v{__version__}")
    
    ffmpeg_path = ResourceManager.ensure_ffmpeg()
    if not ffmpeg_path:
        print("Critical Error: FFmpeg not found or failed to download.")
        
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
