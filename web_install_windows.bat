@echo off
setlocal
if exist "%~dp0package.json" (
  call "%~dp0install_windows.bat"
  exit /b
)
where git >nul 2>&1
if errorlevel 1 (
  echo Install Git from https://git-scm.com then run this script again.
  pause
  exit /b 1
)
set "SASSYCAM_TASK_DIR=%LOCALAPPDATA%\SassyCam-source-%RANDOM%-%RANDOM%"
if exist "%SASSYCAM_TASK_DIR%" exit /b 1
git clone --depth 1 https://github.com/vhaloo/SassyCam.git "%SASSYCAM_TASK_DIR%"
if errorlevel 1 exit /b 1
call "%SASSYCAM_TASK_DIR%\install_windows.bat"