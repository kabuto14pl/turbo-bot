param(
    [string]$Manifest = "",
    [string]$Output = "",
    [int]$MaxRemoteFailures = 0,
    [double]$MinSingleSharpe = 1.2,
    [double]$MaxSingleDrawdown = 15.0,
    [double]$MinSingleProfitFactor = 1.05,
    [double]$MinMultiPositivePairRatio = 0.60,
    [double]$MinWalkforwardPositivePairRatio = 0.50,
    [switch]$UseLatestManifest,
    [switch]$ShowHelp,
    [string[]]$ExtraGateArgs = @()
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Resolve-LatestManifest {
    $resultsDir = Join-Path $scriptDir "ml-service\results"
    if (-not (Test-Path $resultsDir)) {
        return $null
    }

    $latest = Get-ChildItem -Path $resultsDir -Filter "aggregate_manifest.json" -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latest) {
        return $latest.FullName
    }

    return $null
}

function Resolve-PythonLauncher {
    $candidates = @(
        @{ Command = "py"; PrefixArgs = @("-3") },
        @{ Command = "python"; PrefixArgs = @() },
        @{ Command = "python3"; PrefixArgs = @() }
    )

    foreach ($candidate in $candidates) {
        $commandInfo = Get-Command $candidate.Command -ErrorAction SilentlyContinue
        if (-not $commandInfo) {
            continue
        }

        try {
            & $candidate.Command @($candidate.PrefixArgs + @("--version")) *> $null
            if ($LASTEXITCODE -eq 0) {
                return [PSCustomObject]@{
                    Command = $candidate.Command
                    PrefixArgs = $candidate.PrefixArgs
                }
            }
        } catch {}
    }

    throw "Python launcher not found. Install Python or use py/python from PowerShell."
}

if (-not $ShowHelp) {
    if (-not $Manifest -or $UseLatestManifest) {
        $Manifest = Resolve-LatestManifest
    }
    if (-not $Manifest) {
        throw "Manifest path is required, or use -UseLatestManifest after at least one orchestrator run."
    }
    if (-not (Test-Path $Manifest)) {
        throw "Manifest not found: $Manifest"
    }
}

$python = Resolve-PythonLauncher
$gateArgs = @() + $python.PrefixArgs + @("ml-service/backtest_pipeline/remote_gpu_promotion_gate.py")

if ($ShowHelp) {
    $gateArgs += "--help"
} else {
    $gateArgs += @(
        $Manifest,
        "--max-remote-failures", "$MaxRemoteFailures",
        "--min-single-sharpe", "$MinSingleSharpe",
        "--max-single-drawdown", "$MaxSingleDrawdown",
        "--min-single-profit-factor", "$MinSingleProfitFactor",
        "--min-multi-positive-pair-ratio", "$MinMultiPositivePairRatio",
        "--min-walkforward-positive-pair-ratio", "$MinWalkforwardPositivePairRatio",
        "--write-bundle",
        "--activate-bundle"
    )

    if ($Output) {
        $gateArgs += @("--output", $Output)
    }
}

if ($ExtraGateArgs.Count -gt 0) {
    $gateArgs += $ExtraGateArgs
}

Write-Host ""
Write-Host "  TURBO-BOT REMOTE-GPU PROMOTION GATE" -ForegroundColor Green
Write-Host ""
if (-not $ShowHelp) {
    Write-Host "  Manifest: $Manifest" -ForegroundColor Cyan
}
Write-Host "  $($python.Command) $($gateArgs -join ' ')" -ForegroundColor DarkGray
& $python.Command @gateArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0 -and $exitCode -ne 2) {
    throw "Remote-gpu promotion gate failed with exit code $exitCode"
}

exit $exitCode