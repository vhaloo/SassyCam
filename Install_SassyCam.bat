@echo off
setlocal enabledelayedexpansion
title SassyCam v0.1.2 Installer

echo ===================================================
echo           SassyCam v0.1.2 One-Click Installer
echo ===================================================
echo.

:: 1. Check for Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed. Please install it from https://git-scm.com/
    pause
    exit /b
)

:: 2. Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.10+ from https://python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b
)

:: 3. Clone Repository
set REPO_URL=https://github.com/vhaloo/SassyCam.git
set REPO_DIR=SassyCam

if not exist ".git" (
    if not exist "%REPO_DIR%" (
        echo [1/4] Cloning SassyCam from GitHub...
        git clone %REPO_URL%
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to clone repository.
            pause
            exit /b
        )
        cd %REPO_DIR%
    ) else (
        echo [1/4] Entering existing SassyCam directory...
        cd %REPO_DIR%
    )
) else (
    echo [1/4] Already inside SassyCam repository.
)

:: 4. Create Virtual Environment
echo [2/4] Creating virtual environment (venv)...
if not exist "venv" (
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
) else (
    echo Virtual environment already exists.
)

:: 5. Install Dependencies
echo [3/4] Installing dependencies (this may take a few minutes)...
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: 6. Launch Application
echo [4/4] Installation complete! Launching SassyCam...
echo.
start venv\Scripts\python.exe main.py
echo SassyCam is starting. You can close this window.
timeout /t 5 >nul
exit
