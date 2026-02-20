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

    # 4. SAME FOLDER STRATEGY: Copy ALL DLLs to torch root
    # This helps _C.pyd find c10.dll without PATH reliance
    torch_lib = os.path.join(torch_dest, 'lib')
    
    print("Moving Torch DLLs to Package Root...")
    if os.path.exists(torch_lib):
        for file in os.listdir(torch_lib):
            if file.endswith(".dll"):
                src = os.path.join(torch_lib, file)
                dst = os.path.join(torch_dest, file) # Into dist/SassyCam/_internal/torch/
                shutil.copy2(src, dst)
                print(f" -> Moved {file} to torch/")

    # 5. Copy Dependencies to Root (for Main.py pre-loader)
    root_dest = os.path.join("dist", "SassyCam")
    internal_dest = dest_internal
    
    # Hunt TBB
    candidates = [
        r"C:\Users\Vhaloo\Downloads\LT_Build_Temp\LocalTranscriberPro-main\venv\Library\bin\tbb12.dll",
        os.path.join(site_packages, "tbb", "tbb12.dll"),
    ]
    tbb_found = False
    for cand in candidates:
        if os.path.exists(cand):
            shutil.copy2(cand, os.path.join(root_dest, "tbb12.dll"))
            shutil.copy2(cand, os.path.join(torch_dest, "tbb12.dll")) # Also in torch/
            tbb_found = True
            break
            
    # Copy libiomp5md.dll to root from torch/lib
    iomp = os.path.join(torch_lib, "libiomp5md.dll")
    if os.path.exists(iomp):
        shutil.copy2(iomp, os.path.join(root_dest, "libiomp5md.dll"))

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

    print("Build v10 Complete.")

if __name__ == "__main__":
    build()
