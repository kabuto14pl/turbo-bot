param(
    [string]$BinDir = "$env:LOCALAPPDATA\TurboBot\bin"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$commands = @(
    @{ Name = "turbo-local-gpu.cmd"; Target = "start-local-gpu-and-run-replay.ps1" },
    @{ Name = "turbo-gpu-backtest.cmd"; Target = "start-local-gpu-and-run-backtest.ps1" },
    @{ Name = "turbo-full-gpu-orchestrator.cmd"; Target = "start-local-gpu-and-run-full-orchestrator.ps1" },
    @{ Name = "turbo-gpu-promotion-gate.cmd"; Target = "run-remote-gpu-promotion-gate.ps1" },
    @{ Name = "turbo-check-local-gpu.cmd"; Target = "check-local-gpu-service.ps1" },
    @{ Name = "turbo-analyze-quantum.cmd"; Target = "analyze-quantum-fidelity-report.ps1" }
)

function Ensure-PathEntry {
    param(
        [string]$PathEntry
    )

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $parts = @()
    if ($userPath) {
        $parts = $userPath.Split(';') | Where-Object { $_ -and $_.Trim() }
    }

    if ($parts -notcontains $PathEntry) {
        $newPath = if ($userPath -and $userPath.Trim()) { "$userPath;$PathEntry" } else { $PathEntry }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        return $true
    }

    return $false
}

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

foreach ($command in $commands) {
    $shimPath = Join-Path $BinDir $command.Name
    $targetPath = Join-Path $scriptDir $command.Target
    $shimContent = @(
        "@echo off",
        "setlocal",
        ('powershell -ExecutionPolicy Bypass -File "' + $targetPath + '" %*'),
        "exit /b %ERRORLEVEL%"
    ) -join "`r`n"

    Set-Content -Path $shimPath -Value $shimContent -Encoding ASCII
}

$pathUpdated = Ensure-PathEntry -PathEntry $BinDir

Write-Host ""
Write-Host "  TURBO-BOT WINDOWS COMMAND SHIMS" -ForegroundColor Green
Write-Host "  BinDir: $BinDir" -ForegroundColor Green
Write-Host ""
foreach ($command in $commands) {
    Write-Host "[OK] Installed $($command.Name)" -ForegroundColor Green
}

if ($pathUpdated) {
    Write-Host "" 
    Write-Host "[OK] User PATH updated." -ForegroundColor Green
    Write-Host "     Open a NEW PowerShell window before using the commands globally." -ForegroundColor Yellow
} else {
    Write-Host "" 
    Write-Host "[OK] User PATH already contains $BinDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "Available commands from any directory after reopening PowerShell:" -ForegroundColor Cyan
Write-Host "  turbo-check-local-gpu" -ForegroundColor White
Write-Host "  turbo-full-gpu-orchestrator" -ForegroundColor White
Write-Host "  turbo-gpu-backtest" -ForegroundColor White
Write-Host "  turbo-gpu-promotion-gate" -ForegroundColor White
Write-Host "  turbo-local-gpu" -ForegroundColor White
Write-Host "  turbo-analyze-quantum" -ForegroundColor White