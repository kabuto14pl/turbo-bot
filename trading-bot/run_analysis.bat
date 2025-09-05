@echo off
cd /d "%~dp0"
REM Znajdź najnowszy katalog wynikowy
for /f "delims=" %%i in ('dir /b /ad /o-d backtests') do (
    set "latest=%%i"
    goto :found
)
:found
python rolling_metrics_plot.py backtests\%latest%
python rolling_correlation_plot.py backtests\%latest%
explorer backtests\%latest%
pause 