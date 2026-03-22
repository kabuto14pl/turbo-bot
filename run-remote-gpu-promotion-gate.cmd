@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run-remote-gpu-promotion-gate.ps1" %*
exit /b %ERRORLEVEL%