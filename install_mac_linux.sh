#!/bin/bash

# SassyCam Installer (macOS/Linux)

LOG_FILE="$HOME/Desktop/SassyCam_Install_Log.txt"
echo "Installer started at $(date)" > "$LOG_FILE"

echo "==================================================="
echo "           SassyCam Installer (macOS/Linux)"
echo "==================================================="
echo

# --- STEP 1: FIND PYTHON ---
echo "[1/4] Checking for Python..."
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
    echo "[OK] Using Python: $(which python3)" | tee -a "$LOG_FILE"
elif command -v python &> /dev/null; then
    PY_CMD="python"
    echo "[OK] Using Python: $(which python)" | tee -a "$LOG_FILE"
else
    echo "[ERROR] Python 3 not found. Please install Python 3.10+." | tee -a "$LOG_FILE"
    exit 1
fi

# --- STEP 2: SETUP VENV ---
echo "[2/4] Creating Virtual Environment..."
if [ -d "venv" ]; then
    echo "[INFO] Updating existing venv..." >> "$LOG_FILE"
else
    $PY_CMD -m venv venv
fi
source venv/bin/activate

# --- STEP 3: INSTALL DEPENDENCIES ---
echo "[3/4] Installing Dependencies..."
echo "    - Upgrading pip..." >> "$LOG_FILE"
pip install --upgrade pip >> "$LOG_FILE" 2>&1

echo "    - Installing Requirements..." >> "$LOG_FILE"
pip install -r requirements.txt >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies. Check log." | tee -a "$LOG_FILE"
    exit 1
fi

# --- STEP 4: CREATE LAUNCHER ---
echo "[4/4] Creating Launcher..."

# Create run script
cat <<EOF > run_sassycam.sh
#!/bin/bash
cd "\$(dirname "\$0")"
source venv/bin/activate
python main.py
EOF
chmod +x run_sassycam.sh

# Create Desktop Shortcut (OS specific)
OS="$(uname)"
if [ "$OS" == "Darwin" ]; then
    # macOS .command file
    SHORTCUT_PATH="$HOME/Desktop/SassyCam.command"
    cp run_sassycam.sh "$SHORTCUT_PATH"
    chmod +x "$SHORTCUT_PATH"
    echo "[SUCCESS] Created $SHORTCUT_PATH" | tee -a "$LOG_FILE"
elif [ "$OS" == "Linux" ]; then
    # Linux .desktop file
    SHORTCUT_PATH="$HOME/Desktop/SassyCam.desktop"
    cat <<EOF > "$SHORTCUT_PATH"
[Desktop Entry]
Name=SassyCam
Exec=$(pwd)/run_sassycam.sh
Icon=$(pwd)/assets/icon.png
Type=Application
Terminal=false
Categories=Utility;
EOF
    chmod +x "$SHORTCUT_PATH"
    echo "[SUCCESS] Created $SHORTCUT_PATH" | tee -a "$LOG_FILE"
fi

echo
echo "Installation Complete!"
echo "You can launch SassyCam from your Desktop."
