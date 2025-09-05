@echo off
REM 1. Uruchom backtest
npx ts-node main.ts

REM 2. Znajdź najnowszy katalog wynikowy
for /f "delims=" %%i in ('dir /b /ad /o-d backtests') do (
    set "latest=%%i"
    goto :found
)
:found

REM 3. Uruchom rolling metryki i rolling korelacje
python rolling_metrics_plot.py backtests\%latest%
python rolling_correlation_plot.py backtests\%latest%

REM 4. Otwórz katalog wynikowy
explorer backtests\%latest%

pause 