# WebsConnect Auto-Deploy
# Sirf DigitalOcean API token chahiye — GitHub pe code already hai.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "`n=== WebsConnect Auto Deploy ===`n" -ForegroundColor Cyan

# ── doctl install if missing ─────────────────────────────────────
$doctl = Get-Command doctl -ErrorAction SilentlyContinue
if (-not $doctl) {
    $wingetDoctl = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe\doctl.exe"
    if (Test-Path $wingetDoctl) { $doctl = @{ Source = $wingetDoctl } }
    else {
        Write-Host "Installing doctl..." -ForegroundColor Yellow
        winget install DigitalOcean.Doctl -e --accept-source-agreements --accept-package-agreements | Out-Null
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

$doctlExe = if ($doctl.Source) { $doctl.Source } else { "doctl" }

# ── DO token ─────────────────────────────────────────────────────
$token = $env:DIGITALOCEAN_ACCESS_TOKEN
if (-not $token) {
    Write-Host "DigitalOcean API token chahiye." -ForegroundColor Yellow
    Write-Host "Banao yahan: https://cloud.digitalocean.com/account/api/tokens`n" -ForegroundColor Gray
    $token = Read-Host "Token paste karo"
}
& $doctlExe auth init --access-token $token | Out-Null

# ── Create or update app ─────────────────────────────────────────
Write-Host "Deploying to DigitalOcean App Platform..." -ForegroundColor Yellow
$apps = & $doctlExe apps list --format ID,Spec.Name --no-header 2>$null
$appId = ($apps | Select-String "websconnect" | ForEach-Object { ($_ -split '\s+')[0] } | Select-Object -First 1)

if ($appId) {
    Write-Host "  Updating existing app: $appId" -ForegroundColor Gray
    & $doctlExe apps update $appId --spec .do/app.yaml | Out-Null
} else {
    Write-Host "  Creating new app..." -ForegroundColor Gray
    $result = & $doctlExe apps create --spec .do/app.yaml --format ID --no-header
    $appId = ($result | Select-Object -First 1).Trim()
}

Write-Host "  App ID: $appId" -ForegroundColor Green

# ── Wait for deployment ──────────────────────────────────────────
Write-Host "`nWaiting for deploy (2-5 min)..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 15
    $deployment = & $doctlExe apps list-deployments $appId --format ID,Phase --no-header 2>$null | Select-Object -First 1
    if ($deployment -match "ACTIVE|SUCCESS") { $ready = $true; break }
    Write-Host "  ...still deploying" -ForegroundColor Gray
}

$ingress = (& $doctlExe apps get $appId --format DefaultIngress --no-header).Trim()
Write-Host "`nApp URL: https://$ingress" -ForegroundColor Green

# ── Add domains and get DNS records ─────────────────────────────
Write-Host "`nAdding domains..." -ForegroundColor Yellow
$domains = @("websconnect.in", "www.websconnect.in", "api.websconnect.in", "*.websconnect.in")
foreach ($d in $domains) {
    & $doctlExe apps create-domain $appId --domain $d 2>$null
}

# ── Print GoDaddy DNS records ────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GODADDY DNS RECORDS (copy-paste)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "OPTION A — Sabse aasaan (Recommended):" -ForegroundColor Yellow
Write-Host "  GoDaddy → Nameservers → Custom:" -ForegroundColor White
Write-Host "    ns1.digitalocean.com" -ForegroundColor Green
Write-Host "    ns2.digitalocean.com" -ForegroundColor Green
Write-Host "    ns3.digitalocean.com" -ForegroundColor Green
Write-Host "  Phir DO → Networking → Domains → websconnect.in add karo`n" -ForegroundColor Gray

Write-Host "OPTION B — GoDaddy DNS records manually:" -ForegroundColor Yellow
Write-Host "  DO Dashboard → Apps → $appId → Settings → Domains" -ForegroundColor Gray
Write-Host "  Wahan jo IPs aur CNAME dikhe, woh GoDaddy mein daalo:`n" -ForegroundColor Gray

Write-Host "  Type    Name    Value                              TTL" -ForegroundColor White
Write-Host "  A       @       (DO Domains page se IP #1)         1 Hour" -ForegroundColor Gray
Write-Host "  A       @       (DO Domains page se IP #2)         1 Hour" -ForegroundColor Gray
Write-Host "  A       @       (DO Domains page se IP #3)         1 Hour" -ForegroundColor Gray
Write-Host "  CNAME   www     $ingress                           1 Hour" -ForegroundColor Green
Write-Host "  CNAME   api     $ingress                           1 Hour" -ForegroundColor Green
Write-Host "  CNAME   *       $ingress                           1 Hour" -ForegroundColor Green

Write-Host "`n  DELETE these old GoDaddy parking records:" -ForegroundColor Red
Write-Host "    A @ → 3.33.130.190" -ForegroundColor Red
Write-Host "    A @ → 15.197.148.33" -ForegroundColor Red
Write-Host "    Domain Forwarding → OFF`n" -ForegroundColor Red

Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY DONE!" -ForegroundColor Green
Write-Host "  Test: https://$ingress/api/health" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
