#!/bin/bash
cd "$(dirname "$0")"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    python main.py
else
    echo "[ERROR] Virtual environment not found. Please run install_mac_linux.sh first."
    read -p "Press enter to exit"
fi
