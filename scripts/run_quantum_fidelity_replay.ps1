param(
    [string]$RemoteUrl = "http://127.0.0.1:4001",
    [string]$CsvPath = ".\data\BTCUSDT\BTCUSDT_m15.csv",
    [string]$OutputPath = ".\reports\quantum_fidelity_replay_gpu.json",
    [int]$Samples = 12,
    [int]$WaitTimeoutSec = 180,
    [int]$WaitIntervalSec = 5
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

if (-not (Test-Path $CsvPath)) {
    throw "CSV not found: $CsvPath"
}

Write-Host "[replay] root=$rootDir"
Write-Host "[replay] remote_url=$RemoteUrl"
Write-Host "[replay] csv=$CsvPath"
Write-Host "[replay] output=$OutputPath"
Write-Host "[replay] samples=$Samples"

$deadline = (Get-Date).AddSeconds($WaitTimeoutSec)
while ($true) {
    try {
        $health = Invoke-WebRequest -Uri "$RemoteUrl/health" -UseBasicParsing -TimeoutSec 5
        $body = $health.Content
        Write-Host "[replay] health=$body"
        if ($body -match '"status"\s*:\s*"online"') {
            break
        }
    } catch {
    }

    if ((Get-Date) -ge $deadline) {
        throw "GPU service endpoint did not become online before timeout"
    }

    Write-Host "[replay] waiting for online GPU service endpoint..."
    Start-Sleep -Seconds $WaitIntervalSec
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
}

$missingModules = (python -c "import importlib.util; missing=[m for m in ('numpy','pandas') if importlib.util.find_spec(m) is None]; print(','.join(missing))" 2>$null).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Python dependency check failed before replay startup"
}

if ($missingModules) {
    Write-Host "[replay] missing_python_modules=$missingModules"
    Write-Host "[replay] installing required Python packages (numpy, pandas)..."
    python -m pip install --user numpy pandas
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install replay Python dependencies: $missingModules"
    }
}

$env:PYTHONPATH = Join-Path $rootDir "ml-service"
python -m backtest_pipeline.quantum_fidelity_replay --csv $CsvPath --remote-url $RemoteUrl --samples $Samples --output $OutputPath

if ($LASTEXITCODE -ne 0) {
    throw "Quantum fidelity replay failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $OutputPath)) {
    throw "Quantum fidelity replay finished without creating report: $OutputPath"
}

Write-Host "[replay] report_ready=$OutputPath"