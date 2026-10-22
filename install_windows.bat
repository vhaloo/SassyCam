@echo off
setlocal
cd /d "%~dp0"
title SassyCam 1.0 - Source setup
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22.13 or later from https://nodejs.org and run this script again.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||a===22&&b>=13?0:1)"
if errorlevel 1 (
  echo Node.js 22.13 or later is required.
  pause
  exit /b 1
)
call npm ci --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
echo SassyCam is ready. Original 0.1.2 settings and pictures have been preserved.
call Launch_SassyCam.bat
