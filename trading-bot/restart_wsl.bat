@echo off
echo 🔄 WSL Restart Script - Drastyczna optymalizacja zasobów
echo.

echo ⏹️  Zatrzymywanie WSL...
wsl --shutdown

echo ⏱️  Oczekiwanie na pełne zatrzymanie...
timeout /t 5 /nobreak > nul

echo 🚀 Ponowne uruchamianie WSL z nowymi limitami...
wsl

echo.
echo ✅ WSL zrestartowany z ograniczeniami:
echo    💾 Memory: 3GB (z 5.7GB)
echo    🖥️  CPU: 2 cores (z 4)
echo    💿 Swap: 0GB (wyłączony)
echo.
echo 📋 Sprawdź zużycie zasobów w Windows Task Manager
pause
