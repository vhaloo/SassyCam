@echo off
setlocal
cd /d "%~dp0"
if exist "SassyCam.exe" (
  start "" "SassyCam.exe"
  exit /b
)
if exist "node_modules\electron\cli.js" (
  node "node_modules\electron\cli.js" .
  exit /b %errorlevel%
)
echo Run install_windows.bat first, or download the standalone SassyCam package.
pause
exit /b 1
