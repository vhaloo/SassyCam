#!/bin/bash

# SassyCam Web Installer (macOS/Linux)

REPO_URL="https://github.com/vhaloo/SassyCam/archive/refs/heads/master.zip"
INSTALL_DIR="$HOME/SassyCam_Install"

echo "==================================================="
echo "           SassyCam Web Installer"
echo "==================================================="
echo

echo "[1/3] Downloading latest version..."
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

curl -L -o sassycam.zip "$REPO_URL"

if [ ! -f "sassycam.zip" ]; then
    echo "[ERROR] Download failed."
    exit 1
fi

echo "[2/3] Extracting..."
unzip -q sassycam.zip

# Find inner directory
cd */

echo "[3/3] Running Installer..."
chmod +x install_mac_linux.sh
./install_mac_linux.sh
