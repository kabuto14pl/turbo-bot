@echo off
REM ═══════════════════════════════════════════════════════════════════════
REM  PATCH #38: Start GPU Quantum Service on local PC (RTX 5070 Ti)
REM  Usage:
REM    start-gpu-service.bat              -- Start GPU service on port 4000
REM    start-gpu-service.bat --tunnel     -- Start + ngrok tunnel (for VPS)
REM ═══════════════════════════════════════════════════════════════════════

title Turbo-Bot GPU Quantum Service (RTX 5070 Ti)
color 0A

echo.
echo  ████████╗██╗   ██╗██████╗ ██████╗  ██████╗       ██████╗ ██████╗ ██╗   ██╗
echo  ╚══██╔══╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗     ██╔════╝ ██╔══██╗██║   ██║
echo     ██║   ██║   ██║██████╔╝██████╔╝██║   ██║     ██║  ███╗██████╔╝██║   ██║
echo     ██║   ██║   ██║██╔══██╗██╔══██╗██║   ██║     ██║   ██║██╔═══╝ ██║   ██║
echo     ██║   ╚██████╔╝██║  ██║██████╔╝╚██████╔╝     ╚██████╔╝██║     ╚██████╔╝
echo     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝      ╚═════╝ ╚═╝      ╚═════╝
echo.
echo  GPU Quantum Service - RTX 5070 Ti Offload Engine
echo  ─────────────────────────────────────────────────
echo.

REM Check NVIDIA GPU
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] NVIDIA GPU not detected! nvidia-smi failed.
    echo Make sure NVIDIA drivers are installed.
    pause
    exit /b 1
)
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found! Install Node.js v18+ from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js: 
node --version

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INSTALL] Installing dependencies...
    npm install
)

REM Check for @tensorflow/tfjs-node-gpu
echo [CHECK] Verifying TF.js GPU backend...
node -e "try{require('@tensorflow/tfjs-node-gpu');console.log('[OK] tfjs-node-gpu available')}catch(e){console.log('[WARN] tfjs-node-gpu not found, installing...');process.exit(1)}" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INSTALL] Installing @tensorflow/tfjs-node-gpu...
    npm install @tensorflow/tfjs-node-gpu --save
)

echo.
echo [START] Launching GPU Quantum Service on port 4000...
echo.

if "%1"=="--tunnel" (
    echo [TUNNEL] Starting with ngrok tunnel...
    node gpu-quantum-service.js --tunnel
) else (
    node gpu-quantum-service.js
)

pause
