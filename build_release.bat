@echo off
title SassyCam Installer Builder
echo ===================================================
echo      SassyCam Standalone Installer Generator
echo ===================================================
echo.

echo [1/4] Installing Build Dependencies...
pip install pyinstaller
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing dependencies.
    pause
    exit /b
)

echo.

echo [2/4] Building Executable...
python build_exe.py
if %errorlevel% neq 0 (
    echo Build failed.
    pause
    exit /b
)

echo.

echo [3/4] Creating Distribution Folder...
mkdir SassyCam_Release 2>nul
xcopy /E /I /Y dist\SassyCam SassyCam_Release\SassyCam
copy README.md SassyCam_Release\
copy LICENSE SassyCam_Release\
copy Launch_SassyCam.bat SassyCam_Release\
copy Launch_SassyCam.sh SassyCam_Release\

echo.

echo [4/4] Done! 
echo The 'SassyCam_Release' folder contains your standalone app.
echo You can zip this folder and share it.
echo.
