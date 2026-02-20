import PyInstaller.__main__
import os
import shutil
import torch

# 1. Clean previous build
if os.path.exists("dist"): shutil.rmtree("dist")
if os.path.exists("build"): shutil.rmtree("build")

# 2. targeted DLL collection (Avoid collect_all to prevent recursion/hangs)
torch_path = os.path.dirname(torch.__file__)
torch_lib = os.path.join(torch_path, 'lib')
libiomp = os.path.join(torch_lib, 'libiomp5md.dll')

hiddenimports = [
    'scipy.special.cython_special',
    'tiktoken_ext.openai_public',
    'tiktoken_ext',
    'win32timezone',
    'whisper'
]

args = [
    'main.py',
    '--name=SassyCam',
    '--noconsole',
    '--icon=NONE',
    '--runtime-hook=rthook_torch.py',
]

# Manually add libiomp5md.dll to root if it exists
if os.path.exists(libiomp):
    args.append(f'--add-binary={libiomp}{os.pathsep}.')
else:
    print(f"Warning: {libiomp} not found. Build might fail at runtime.")

# Add hidden imports
for h in hiddenimports:
    args.append(f'--hidden-import={h}')

print("Starting PyInstaller Build...")
PyInstaller.__main__.run(args)
print("Build Complete. Check 'dist/SassyCam'.")
