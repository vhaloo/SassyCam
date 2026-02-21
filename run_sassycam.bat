@echo off
setlocal
cd /d "%~dp0"
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    start "" pythonw main.py
) else (
    echo [ERROR] Virtual environment not found. Please run install_windows.bat first.
    pause
)
