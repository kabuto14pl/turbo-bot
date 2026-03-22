@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-local-gpu-and-run-replay.ps1" %*
exit /b %ERRORLEVEL%