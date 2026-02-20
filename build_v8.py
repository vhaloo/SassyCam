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

    # 5. HUNT AND COPY TBB12.DLL
    # PyInstaller warned it was missing. Numba/Torch likely needs it.
    print("Hunting for tbb12.dll...")
    tbb_found = False
    # Known locations from user environment
    candidates = [
        r"C:\Users\Vhaloo\Downloads\LT_Build_Temp\LocalTranscriberPro-main\venv\Library\bin\tbb12.dll",
        r"C:\Users\Vhaloo\AppData\Roaming\Zoom\bin\OpenVINO_B\tbb12.dll",
        os.path.join(site_packages, "tbb", "tbb12.dll"), # If tbb pip package is installed
    ]
    
    for cand in candidates:
        if os.path.exists(cand):
            print(f"Found TBB at: {cand}")
            shutil.copy2(cand, os.path.join(root_dest, "tbb12.dll"))
            shutil.copy2(cand, os.path.join(internal_dest, "tbb12.dll"))
            tbb_found = True
            break
            
    if not tbb_found:
        print("WARNING: tbb12.dll not found. App may crash.")

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

    print("Build v8 Complete.")

if __name__ == "__main__":
    build()
