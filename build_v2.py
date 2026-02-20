import PyInstaller.__main__
import os
import shutil
import site
import sys

def build():
    print("Starting SassyCam v0.0.5 Build Process...")

    # 1. Clean previous build
    if os.path.exists("dist"): shutil.rmtree("dist")
    if os.path.exists("build"): shutil.rmtree("build")

    # 2. PyInstaller Arguments
    # CRITICAL: We EXCLUDE torch to prevent the analysis crash.
    # We will copy it manually later.
    args = [
        'main.py',
        '--name=SassyCam',
        '--noconsole',
        '--clean',
        '--icon=NONE',
        '--exclude-module=torch', 
        '--exclude-module=torchaudio',
        '--exclude-module=torchvision',
        # Keep other imports
        '--hidden-import=whisper',
        '--hidden-import=tiktoken_ext.openai_public',
        '--hidden-import=tiktoken_ext',
        '--hidden-import=scipy.special.cython_special',
        '--hidden-import=win32timezone',
    ]

    print("Running PyInstaller (Excluding Torch)...")
    PyInstaller.__main__.run(args)
    print("PyInstaller Phase Complete.")

    # 3. Manual Package Copy logic
    # Find torch source
    try:
        import torch
        torch_src = os.path.dirname(torch.__file__)
    except ImportError:
        print("CRITICAL ERROR: 'torch' not found in environment. Cannot copy.")
        sys.exit(1)

    dest_internal = os.path.join("dist", "SassyCam", "_internal")
    torch_dest = os.path.join(dest_internal, 'torch')
    
    print(f"Copying Torch manually from {torch_src}...")
    
    if os.path.exists(torch_src):
        shutil.copytree(torch_src, torch_dest)
        print("Torch copied successfully.")
    else:
        print(f"ERROR: Could not find torch at {torch_src}")
        sys.exit(1)

    # 4. Flatten Torch DLLs to Root (The Nuclear Option for WinError 1114)
    # Windows loader ALWAYS looks in the app root first.
    torch_lib = os.path.join(torch_dest, 'lib')
    root_dest = os.path.join("dist", "SassyCam")
    
    print("Flattening Torch DLLs to root...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                dst = os.path.join(root_dest, file)
                shutil.copy2(src, dst)
                # print(f" -> Copied {file} to root")
    
    # 5. Copy extra assets if needed (e.g. models, config)
    # Copy config.json if exists
    if os.path.exists("config.json"):
        shutil.copy("config.json", os.path.join(root_dest, "config.json"))
        
    # Copy Launch_SassyCam.bat if exists
    if os.path.exists("Launch_SassyCam.bat"):
         shutil.copy("Launch_SassyCam.bat", os.path.join(root_dest, "Launch_SassyCam.bat"))

    print("Build v0.0.5 Complete.")

if __name__ == "__main__":
    build()
