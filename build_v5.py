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

    # 4. Flatten Torch DLLs to Root AND _internal
    torch_lib = os.path.join(torch_dest, 'lib')
    root_dest = os.path.join("dist", "SassyCam")
    internal_dest = dest_internal # _internal root
    
    print("Distributing Torch DLLs...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                shutil.copy2(src, os.path.join(root_dest, file))
                shutil.copy2(src, os.path.join(internal_dest, file))

    # 5. SAFE PATCH TORCH __init__.py
    init_path = os.path.join(torch_dest, '__init__.py')
    print(f"Patching {init_path}...")
    
    with open(init_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(init_path, 'w', encoding='utf-8') as f:
        for line in lines:
            # We want to disable the call: _load_dll_libraries()
            # But NOT the definition: def _load_dll_libraries()
            stripped = line.strip()
            
            if stripped == '_load_dll_libraries()':
                # Capture exact indentation from the original line
                indentation = line[:line.find(stripped)]
                f.write(f"{indentation}pass # PATCHED: Call disabled\n")
            elif stripped == 'del _load_dll_libraries':
                 # Also disable the delete so we don't error if it wasn't defined/called
                indentation = line[:line.find(stripped)]
                f.write(f"{indentation}pass # PATCHED: Del disabled\n")
            else:
                f.write(line)

    print("Build v5 Complete.")

if __name__ == "__main__":
    build()
