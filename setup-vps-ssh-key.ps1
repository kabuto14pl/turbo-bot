param(
    [string]$VpsHost = "root@64.226.70.149",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519",
    [string]$KeyComment = "turbo-bot-vps"
)

$ErrorActionPreference = "Stop"

Write-Host "" 
Write-Host "  TURBO-BOT VPS SSH KEY SETUP" -ForegroundColor Green
Write-Host "" 
Write-Host "Target: $VpsHost" -ForegroundColor White
Write-Host "Key:    $KeyPath" -ForegroundColor White
Write-Host "" 

$sshDir = Split-Path -Parent $KeyPath
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "[1/4] Generating SSH key..." -ForegroundColor Cyan
    & ssh-keygen -t ed25519 -C $KeyComment -f $KeyPath -N ""
    Write-Host "[OK] SSH key generated" -ForegroundColor Green
} else {
    Write-Host "[1/4] SSH key already exists" -ForegroundColor Green
}

$pubKeyPath = "$KeyPath.pub"
if (-not (Test-Path $pubKeyPath)) {
    throw "Public key not found: $pubKeyPath"
}

Write-Host "" 
Write-Host "[2/4] Installing public key on VPS..." -ForegroundColor Cyan
Write-Host "      You may be asked for the VPS password once." -ForegroundColor Yellow

$pubKeyContent = Get-Content $pubKeyPath -Raw
$escapedKey = $pubKeyContent.Trim().Replace("'", "'\''")
$remoteCmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qxF '$escapedKey' ~/.ssh/authorized_keys 2>/dev/null || echo '$escapedKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh $VpsHost $remoteCmd

Write-Host "[OK] Public key installed" -ForegroundColor Green

Write-Host "" 
Write-Host "[3/4] Verifying passwordless SSH..." -ForegroundColor Cyan
ssh -o BatchMode=yes -o PreferredAuthentications=publickey -o PasswordAuthentication=no -o ConnectTimeout=8 $VpsHost "echo [ssh-ok]"

Write-Host "[OK] Passwordless SSH verified" -ForegroundColor Green

Write-Host "" 
Write-Host "[4/4] Next commands" -ForegroundColor Cyan
Write-Host "  1. powershell -ExecutionPolicy Bypass -File .\start-gpu-and-run-replay.ps1" -ForegroundColor White
Write-Host "  2. bash -lc ./scripts/check_vps_gpu_tunnel.sh" -ForegroundColor White
Write-Host "  3. bash -lc ./scripts/analyze_quantum_fidelity_report.sh" -ForegroundColor White
Write-Host "" 