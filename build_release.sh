#!/bin/bash
echo "==================================================="
echo "      SassyCam Standalone Installer Generator      "
echo "==================================================="
echo

echo "[1/4] Installing Build Dependencies (PyInstaller)..."
pip install pyinstaller
if [ $? -ne 0 ]; then
    echo "Error installing PyInstaller."
    exit 1
fi

echo
echo "[2/4] Building Executable..."
python3 build_exe.py
if [ $? -ne 0 ]; then
    echo "Build failed."
    exit 1
fi

echo
echo "[3/4] Creating Distribution Folder..."
mkdir -p SassyCam_Release
cp -r dist/SassyCam SassyCam_Release/
cp README.md SassyCam_Release/
cp LICENSE SassyCam_Release/

echo
echo "[4/4] Done! "
echo "The 'SassyCam_Release' folder contains your standalone app."
echo "You can compress this folder and share it."
echo
