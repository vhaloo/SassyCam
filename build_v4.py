import PyInstaller.__main__
import os
import shutil
import site
import sys

def build():
    # 1. Clean previous build
    if os.path.exists("dist"): shutil.rmtree("dist")
    if os.path.exists("build"): shutil.rmtree("build")

    # 2. PyInstaller Arguments
    args = [
        'main.py',
        '--name=SassyCam',
        '--noconsole',
        '--icon=NONE',
        '--exclude-module=torch', 
        '--exclude-module=torchaudio',
        '--exclude-module=torchvision',
        '--hidden-import=whisper',
        '--hidden-import=tiktoken_ext.openai_public',
        '--hidden-import=tiktoken_ext',
        '--hidden-import=scipy.special.cython_special',
        '--hidden-import=win32timezone',
    ]

    print("Starting PyInstaller Build (Excluding Torch)...")
    PyInstaller.__main__.run(args)
    
    # 3. Manual Package Copy
    site_packages = site.getsitepackages()[1]
    if "site-packages" not in site_packages:
        site_packages = site.getsitepackages()[0]

    torch_src = os.path.join(site_packages, 'torch')
    dest_internal = os.path.join("dist", "SassyCam", "_internal")
    torch_dest = os.path.join(dest_internal, 'torch')
    
    print(f"Copying Torch manually from {torch_src}...")
    if os.path.exists(torch_src):
        shutil.copytree(torch_src, torch_dest)
    else:
        import torch
        torch_src = os.path.dirname(torch.__file__)
        shutil.copytree(torch_src, torch_dest)

    # 4. Strategic DLL Placement
    # We copy essential DLLs to locations where Windows/Python is guaranteed to look.
    torch_lib = os.path.join(torch_dest, 'lib')
    root_dest = os.path.join("dist", "SassyCam")
    internal_dest = dest_internal # _internal root
    
    print("Distributing Torch DLLs...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                
                # 1. To App Root (SassyCam.exe dir) - Primary lookup
                shutil.copy2(src, os.path.join(root_dest, file))
                
                # 2. To _internal root - Secondary lookup
                shutil.copy2(src, os.path.join(internal_dest, file))
                
                print(f" -> Copied {file}")

    print("Build v4 Complete.")

if __name__ == "__main__":
    build()
