@echo off
title SassyCam Installer
echo ===================================================
echo           SassyCam All-in-One Installer
echo ===================================================
echo.

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+ from python.org.
    pause
    exit /b
)

:: 2. Create Virtual Environment
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [1/4] Virtual environment already exists.
)

:: 3. Install Dependencies
echo [2/4] Installing dependencies (this may take a minute)...
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

:: 4. Launch App
echo.
echo [3/4] Setup complete!
echo [4/4] Launching SassyCam...
python main.py
echo.
echo SassyCam has closed.
pause
