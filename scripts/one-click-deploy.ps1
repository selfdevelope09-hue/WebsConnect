# WebsConnect — One-Click Deploy Script
# Usage: Right-click → Run with PowerShell  OR  paste in Cursor terminal

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WebsConnect — One-Click Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: GitHub Push ──────────────────────────────────────────
Write-Host "[1/3] GitHub setup..." -ForegroundColor Yellow

$ghAuth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GitHub login required (browser khulega)..." -ForegroundColor Gray
    gh auth login -h github.com -p https -w
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    $username = Read-Host "  Apna GitHub username daalo"
    git branch -M main
    gh repo create websConnect --public --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) {
        git remote add origin "https://github.com/$username/websConnect.git"
        git push -u origin main
    }
} else {
    Write-Host "  Remote already set: $remote" -ForegroundColor Gray
    git push origin main 2>$null
    if ($LASTEXITCODE -ne 0) { git push origin master }
}

Write-Host "  GitHub done!" -ForegroundColor Green

# ── Step 2: DigitalOcean Deploy ──────────────────────────────────
Write-Host ""
Write-Host "[2/3] DigitalOcean deploy..." -ForegroundColor Yellow

$doToken = $env:DIGITALOCEAN_ACCESS_TOKEN
if (-not $doToken) {
    Write-Host "  DO token chahiye. DigitalOcean → API → Generate Token" -ForegroundColor Gray
    $doToken = Read-Host "  Token paste karo (ghabrayo mat, terminal mein dikhega)"
    $env:DIGITALOCEAN_ACCESS_TOKEN = $doToken
}

doctl auth init --access-token $doToken 2>$null

$existingApp = doctl apps list --format ID,Spec.Name --no-header 2>$null | Select-String "websconnect"
if ($existingApp) {
    $appId = ($existingApp -split '\s+')[0]
    Write-Host "  App already exists ($appId), updating..." -ForegroundColor Gray
    doctl apps update $appId --spec .do/app.yaml
} else {
    Write-Host "  Creating new app..." -ForegroundColor Gray
    doctl apps create --spec .do/app.yaml
}

Write-Host "  DigitalOcean deploy triggered!" -ForegroundColor Green

# ── Step 3: DNS Instructions ─────────────────────────────────────
Write-Host ""
Write-Host "[3/3] DNS setup (GoDaddy)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  GoDaddy mein yeh 3 nameservers daalo:" -ForegroundColor White
Write-Host "    ns1.digitalocean.com" -ForegroundColor Cyan
Write-Host "    ns2.digitalocean.com" -ForegroundColor Cyan
Write-Host "    ns3.digitalocean.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Phir DO → Networking → Domains → websconnect.in add karo" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETE! 1-2 ghante wait karo." -ForegroundColor Green
Write-Host "  https://websconnect.in" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
