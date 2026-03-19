param(
    [switch]$KillOwners
)

$ErrorActionPreference = "Continue"
$port = 4001

function Get-PortOwners {
    return @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -gt 0 })
}

function Get-ProcessDetails {
    param(
        [int]$ProcessId
    )

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue

    [PSCustomObject]@{
        Pid = $ProcessId
        Name = if ($process) { $process.ProcessName } else { "unknown" }
        Path = if ($cim) { $cim.ExecutablePath } else { $null }
        CommandLine = if ($cim) { $cim.CommandLine } else { $null }
    }
}

function Get-Health {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $response.Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

Write-Host ""
Write-Host "  TURBO-BOT LOCAL GPU SERVICE CHECK" -ForegroundColor Green
Write-Host "  Port: $port" -ForegroundColor Green
Write-Host ""

$owners = Get-PortOwners
$health = Get-Health

if ($owners.Count -eq 0) {
    Write-Host "[INFO] No process is currently listening on port $port." -ForegroundColor Yellow
} else {
    Write-Host "[INFO] Port $port owners:" -ForegroundColor Cyan
    foreach ($ownerId in $owners) {
        $details = Get-ProcessDetails -ProcessId $ownerId
        Write-Host "  PID: $($details.Pid)" -ForegroundColor White
        Write-Host "  Name: $($details.Name)" -ForegroundColor White
        if ($details.Path) {
            Write-Host "  Path: $($details.Path)" -ForegroundColor DarkGray
        }
        if ($details.CommandLine) {
            Write-Host "  CommandLine: $($details.CommandLine)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
}

if ($health) {
    Write-Host "[INFO] Health endpoint response:" -ForegroundColor Cyan
    Write-Host "  Status: $($health.status)" -ForegroundColor White
    Write-Host "  Service: $($health.service)" -ForegroundColor White
    Write-Host "  Version: $($health.version)" -ForegroundColor White
    if ($health.gpu) {
        Write-Host "  Device: $($health.gpu.device)" -ForegroundColor White
        Write-Host "  CUDA: $($health.gpu.cuda_available)" -ForegroundColor White
        Write-Host "  VRAM Total GB: $($health.gpu.vram_total_gb)" -ForegroundColor White
        Write-Host "  Utilization %: $($health.gpu.utilization_pct)" -ForegroundColor White
        if ($health.gpu.init_error) {
            Write-Host "  GPU Init Error: $($health.gpu.init_error)" -ForegroundColor Red
        }
    }
    if ($health.init_error) {
        Write-Host "  Init Error: $($health.init_error)" -ForegroundColor Red
    }
} else {
    Write-Host "[INFO] Health endpoint did not respond on http://127.0.0.1:$port/health." -ForegroundColor Yellow
}

if ($KillOwners -and $owners.Count -gt 0) {
    Write-Host ""
    Write-Host "[ACTION] Stopping all current port owners..." -ForegroundColor Yellow
    foreach ($ownerId in $owners) {
        Stop-Process -Id $ownerId -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped PID $ownerId" -ForegroundColor DarkGray
    }
}
