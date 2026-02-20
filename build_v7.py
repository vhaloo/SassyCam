import PyInstaller.__main__
import os
import shutil
import site
import sys
import glob

def build():
    # 1. Clean
    if os.path.exists("dist"): shutil.rmtree("dist")
    if os.path.exists("build"): shutil.rmtree("build")

    # 2. PyInstaller
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

    print("Starting PyInstaller Build...")
    PyInstaller.__main__.run(args)
    
    # 3. Manual Torch Copy
    site_packages = site.getsitepackages()[1]
    if "site-packages" not in site_packages:
        site_packages = site.getsitepackages()[0]

    torch_src = os.path.join(site_packages, 'torch')
    dest_internal = os.path.join("dist", "SassyCam", "_internal")
    torch_dest = os.path.join(dest_internal, 'torch')
    
    print(f"Copying Torch from {torch_src}...")
    if os.path.exists(torch_src):
        shutil.copytree(torch_src, torch_dest)
    else:
        import torch
        torch_src = os.path.dirname(torch.__file__)
        shutil.copytree(torch_src, torch_dest)

    # 4. Triple Flatten DLLs
    torch_lib = os.path.join(torch_dest, 'lib')
    root_dest = os.path.join("dist", "SassyCam")
    internal_dest = dest_internal 
    package_dest = torch_dest
    
    print("Flattening Torch DLLs...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                shutil.copy2(src, os.path.join(root_dest, file))
                shutil.copy2(src, os.path.join(internal_dest, file))
                shutil.copy2(src, os.path.join(package_dest, file))

    # 5. Hunt for tbb12.dll
    # It wasn't in site-packages, so we search explicitly or skip.
    # Since we can't easily find it in the environment via script without a full search,
    # we'll skip the automated copy and rely on the user having it or it being optional.
    # However, we'll try to find it in the current env vars.
    
    # 6. Patch __init__.py
    init_path = os.path.join(torch_dest, '__init__.py')
    print(f"Patching {init_path}...")
    with open(init_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    with open(init_path, 'w', encoding='utf-8') as f:
        for line in lines:
            stripped = line.strip()
            if stripped == '_load_dll_libraries()':
                indentation = line[:line.find(stripped)]
                f.write(f"{indentation}pass # PATCHED\n")
            elif stripped == 'del _load_dll_libraries':
                indentation = line[:line.find(stripped)]
                f.write(f"{indentation}pass # PATCHED\n")
            else:
                f.write(line)

    print("Build v7 Complete.")

if __name__ == "__main__":
    build()
