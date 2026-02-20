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

    # 4. Flatten Torch DLLs to Root AND Torch Package Root
    torch_lib = os.path.join(torch_dest, 'lib')
    root_dest = os.path.join("dist", "SassyCam")
    torch_root_dest = torch_dest # _internal/torch/
    
    print("Flattening Torch DLLs...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                
                # Copy to App Root (for main process)
                shutil.copy2(src, os.path.join(root_dest, file))
                
                # Copy to Torch Package Root (next to _C.pyd for relative lookup)
                shutil.copy2(src, os.path.join(torch_root_dest, file))
                
                print(f" -> Distributed {file}")

    # 5. MONKEY PATCH TORCH __init__.py
    # We disable the built-in DLL loader because we are handling it in main.py
    # and the built-in one is fragile in frozen builds.
    init_path = os.path.join(torch_dest, '__init__.py')
    print(f"Patching {init_path} to disable _load_dll_libraries...")
    
    with open(init_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(init_path, 'w', encoding='utf-8') as f:
        for line in lines:
            # Comment out the call to _load_dll_libraries() but NOT the definition
            if '_load_dll_libraries()' in line and not line.strip().startswith('def '):
                # Use pass to maintain indentation validity if it's the only line in a block
                indent = line[:len(line) - len(line.lstrip())]
                f.write(f"{indent}pass # PATCHED: Call disabled\n")
            else:
                f.write(line)

    print("Build v3 Complete.")

if __name__ == "__main__":
    build()
