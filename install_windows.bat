@echo off
setlocal EnableDelayedExpansion
title SassyCam Installer (Windows)
color 1F
cd /d "%~dp0"

:: --- LOGGING ---
set "LOG_FILE=%USERPROFILE%\Desktop\SassyCam_Install_Log.txt"
echo Installer started at %DATE% %TIME% > "%LOG_FILE%"

echo ===================================================
echo           SassyCam Installer (Windows)
echo ===================================================
echo.
echo [INFO] Installing SassyCam...
echo [INFO] Logs saved to: %LOG_FILE%

:: --- STEP 1: FIND PYTHON ---
echo [1/4] Checking for Python...
set "PY_PATH="

:: Check standard paths
if exist "%ProgramFiles%\Python312\python.exe" set "PY_PATH=%ProgramFiles%\Python312\python.exe" & goto :FOUND_PY
if exist "%ProgramFiles%\Python311\python.exe" set "PY_PATH=%ProgramFiles%\Python311\python.exe" & goto :FOUND_PY
if exist "%ProgramFiles%\Python310\python.exe" set "PY_PATH=%ProgramFiles%\Python310\python.exe" & goto :FOUND_PY
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_PATH=%LOCALAPPDATA%\Programs\Python\Python312\python.exe" & goto :FOUND_PY
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_PATH=%LOCALAPPDATA%\Programs\Python\Python311\python.exe" & goto :FOUND_PY
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PY_PATH=%LOCALAPPDATA%\Programs\Python\Python310\python.exe" & goto :FOUND_PY

:: Check PATH
python --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('where python') do set "PY_PATH=%%i"
    goto :FOUND_PY
)

echo [ERROR] Python not found. Please install Python 3.10+ from python.org. >> "%LOG_FILE%"
echo [ERROR] Python not found.
pause
exit /b 1

:FOUND_PY
echo [OK] Using Python: !PY_PATH! >> "%LOG_FILE%"
echo [OK] Using Python: !PY_PATH!

:: --- STEP 2: SETUP VENV ---
echo [2/4] Creating Virtual Environment...
if exist "venv" (
    echo [INFO] Updating existing venv... >> "%LOG_FILE%"
) else (
    "!PY_PATH!" -m venv venv
)
call venv\Scripts\activate.bat

:: --- STEP 3: INSTALL DEPENDENCIES ---
echo [3/4] Installing Dependencies...
echo     - Upgrading pip... >> "%LOG_FILE%"
python -m pip install --upgrade pip >> "%LOG_FILE%" 2>&1

echo     - Installing Requirements... >> "%LOG_FILE%"
pip install -r requirements.txt >> "%LOG_FILE%" 2>&1

if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies. Check log. >> "%LOG_FILE%"
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

:: --- STEP 4: CREATE SHORTCUT ---
echo [4/4] Creating Desktop Shortcut...

set "TARGET_SCRIPT=%~dp0run_sassycam.bat"
set "ICON_PATH=%~dp0assets\icon.ico"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\SassyCam.lnk"

:: Create the launcher batch file first
echo @echo off > "%TARGET_SCRIPT%"
echo cd /d "%%~dp0" >> "%TARGET_SCRIPT%"
echo call venv\Scripts\activate.bat >> "%TARGET_SCRIPT%"
echo start "" pythonw main.py >> "%TARGET_SCRIPT%"

:: Use PowerShell to create the shortcut
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%TARGET_SCRIPT%';$s.IconLocation='%ICON_PATH%';$s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Shortcut created on Desktop. >> "%LOG_FILE%"
    echo [SUCCESS] SassyCam installed successfully!
) else (
    echo [WARNING] Could not create shortcut. You can run 'run_sassycam.bat' manually.
)

echo.
echo Press any key to launch SassyCam...
pause >nul
call "%TARGET_SCRIPT%"
