import os
import sys

def _append_to_path():
    # When frozen, sys._MEIPASS is the temp directory where assets are unpacked
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    # Paths to check for DLLs
    paths_to_add = [
        os.path.join(base_path, 'torch', 'lib'),
        os.path.join(base_path, 'torch'),
        base_path # Root of _internal
    ]
    
    # Also explicitly add system paths if needed (though usually handled by OS)
    # But adding the internal dirs to PATH is critical for dependencies like libiomp5md.dll
    
    current_path = os.environ.get('PATH', '')
    for p in paths_to_add:
        if os.path.exists(p):
            current_path = p + os.pathsep + current_path
            
    os.environ['PATH'] = current_path
    
    # Preload critical DLLs if possible (sometimes helps)
    try:
        import ctypes
        ctypes.CDLL(os.path.join(base_path, 'libiomp5md.dll'))
    except Exception:
        pass

_append_to_path()
