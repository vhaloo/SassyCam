import PyInstaller.__main__
import os
import shutil

# 1. Clean previous build
if os.path.exists("dist"): shutil.rmtree("dist")
if os.path.exists("build"): shutil.rmtree("build")

# 2. Define Assets
# We need to collect the assets folder if it exists, but the code handles downloading them if missing.
# However, for a "full" installer, we might want to bundle the ONNX models if we had them.
# For now, let's assume 'assets' will be created/populated at runtime in the dist folder or AppData.
# But we DO need to handle hidden imports for our libs.

args = [
    'main.py',
    '--name=SassyCam',
    '--noconsole',
    '--icon=NONE', # TODO: Add an icon if available
    # Hidden imports for dynamic libraries
    '--hidden-import=scipy.special.cython_special',
    '--hidden-import=tiktoken_ext.openai_public',
    '--hidden-import=tiktoken_ext',
    # Collect data for kokoro/whisper if needed (usually handled by the libs or downloaded)
    # We rely on the app downloading models to the local 'assets' folder relative to the EXE.
]

print("Starting PyInstaller Build...")
PyInstaller.__main__.run(args)
print("Build Complete. Check 'dist/SassyCam'.")
