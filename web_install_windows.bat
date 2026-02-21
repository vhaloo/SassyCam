@echo off
setlocal EnableDelayedExpansion
title SassyCam Web Installer
color 1F

:: URL to the SassyCam repository ZIP (Using placeholder, user must update)
set "REPO_URL=https://github.com/vhaloo/SassyCam/archive/refs/heads/master.zip"
set "INSTALL_DIR=%USERPROFILE%\SassyCam_Install"

echo ===================================================
echo           SassyCam Web Installer
echo ===================================================
echo.
echo [1/3] Downloading latest version...

if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%"
cd "%INSTALL_DIR%"

powershell -Command "$progressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%REPO_URL%' -OutFile 'sassycam.zip'"

if not exist "sassycam.zip" (
    echo [ERROR] Download failed. Please check your internet connection.
    pause
    exit /b 1
)

echo [2/3] Extracting...
powershell -Command "Expand-Archive -Path 'sassycam.zip' -DestinationPath '.' -Force"

:: Find the inner directory (e.g., SassyCam-main)
for /d %%D in (*) do (
    cd "%%D"
    goto :FOUND_DIR
)
:FOUND_DIR

echo [3/3] Running Installer...
if exist "install_windows.bat" (
    call install_windows.bat
) else (
    echo [ERROR] Installer script not found in the repository.
    pause
    exit /b 1
)

pause
