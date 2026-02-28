#!/usr/bin/env pwsh
<#
.SYNOPSIS
    SSH Reverse Tunnel: VPS → Local Ollama (RTX 5070 Ti)
    
.DESCRIPTION
    Tworzy persistent SSH reverse tunnel z VPS (64.226.70.149) do lokalnego
    Ollama (127.0.0.1:11434). Bot na VPS łączy się z localhost:11434 i trafia
    przez tunel do Twojego RTX 5070 Ti.
    
    WYMAGANIA:
    - Ollama musi być uruchomiona lokalnie (ollama serve)
    - SSH klucz do root@64.226.70.149 musi być skonfigurowany
    - Model qwen3:14b pobrany (ollama pull qwen3:14b)
    
.NOTES
    PATCH #39 - Ollama GPU Integration via SSH Tunnel
    Data: 2026-02-20
#>

param(
    [string]$VpsHost = "64.226.70.149",
    [string]$VpsUser = "root",
    [int]$OllamaPort = 11434,
    [switch]$Check
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SSH REVERSE TUNNEL → Ollama RTX 5070 Ti" -ForegroundColor Cyan
Write-Host "  VPS ($VpsHost) → localhost:$OllamaPort" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# --- 1. Sprawdź czy Ollama działa lokalnie ---
Write-Host "[1/4] Sprawdzanie Ollama lokalnie..." -ForegroundColor Yellow
try {
    $ollamaResp = Invoke-WebRequest -Uri "http://127.0.0.1:$OllamaPort" -UseBasicParsing -TimeoutSec 3
    if ($ollamaResp.Content -like "*Ollama*") {
        Write-Host "  ✅ Ollama działa" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Ollama NIE działa! Uruchom: ollama serve" -ForegroundColor Red
    exit 1
}

# --- 2. Sprawdź model qwen3:14b ---
Write-Host "[2/4] Sprawdzanie modelu qwen3:14b..." -ForegroundColor Yellow
$models = ollama list 2>&1
if ($models -match "qwen3:14b") {
    Write-Host "  ✅ qwen3:14b dostępny" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ qwen3:14b NIE znaleziony! Pobieranie..." -ForegroundColor Yellow
    ollama pull qwen3:14b
}

# --- 3. Sprawdź GPU ---
Write-Host "[3/4] Sprawdzanie GPU..." -ForegroundColor Yellow
try {
    $gpuInfo = nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader 2>&1
    Write-Host "  ✅ GPU: $gpuInfo" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ nvidia-smi niedostępne" -ForegroundColor Yellow
}

# --- 4. Quick check mode ---
if ($Check) {
    Write-Host ""
    Write-Host "[CHECK] Testowanie tunelu na VPS..." -ForegroundColor Yellow
    $result = ssh "${VpsUser}@${VpsHost}" "curl -s --connect-timeout 5 http://127.0.0.1:${OllamaPort} 2>&1 || echo 'TUNNEL_DOWN'"
    if ($result -like "*Ollama*") {
        Write-Host "  ✅ Tunel AKTYWNY — VPS widzi Ollama" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Tunel NIE DZIAŁA — restart potrzebny" -ForegroundColor Red
    }
    exit 0
}

# --- 5. Zwolnij stary port na VPS ---
Write-Host "[4/4] Czyszczenie starego tunelu na VPS..." -ForegroundColor Yellow
ssh "${VpsUser}@${VpsHost}" "fuser -k ${OllamaPort}/tcp 2>/dev/null; sleep 1" 2>$null
Write-Host "  ✅ Port zwolniony" -ForegroundColor Green

# --- 6. Uruchom tunel ---
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🚀 URUCHAMIANIE TUNELU SSH..." -ForegroundColor Green
Write-Host "  VPS:$OllamaPort → localhost:$OllamaPort" -ForegroundColor Green
Write-Host "  Ctrl+C aby zatrzymać" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Keepalive co 30s, max 20 missed → 10 min tolerance
ssh -R "${OllamaPort}:127.0.0.1:${OllamaPort}" "${VpsUser}@${VpsHost}" `
    -N `
    -o ServerAliveInterval=30 `
    -o ServerAliveCountMax=20 `
    -o ExitOnForwardFailure=yes `
    -o TCPKeepAlive=yes

Write-Host ""
Write-Host "  ⚠️ Tunel zamknięty. Bot wróci na GPT-4o-mini fallback." -ForegroundColor Yellow
