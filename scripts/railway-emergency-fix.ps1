#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Emergency fix script for Railway deployment issues

.DESCRIPTION
    This script diagnoses and fixes common Railway deployment problems:
    - Missing environment variables
    - Placeholder values not replaced
    - Incorrect configuration settings
    - Database connection issues
    
.PARAMETER AutoFix
    Automatically apply fixes without confirmation

.PARAMETER Service
    Target Railway service (default: contesthub-backend)

.EXAMPLE
    .\railway-emergency-fix.ps1
    # Run diagnostics and show recommended fixes

.EXAMPLE
    .\railway-emergency-fix.ps1 -AutoFix -Service contesthub-backend
    # Automatically fix all issues
#>

param(
    [switch]$AutoFix,
    [string]$Service = "contesthub-backend"
)

$ErrorActionPreference = "Continue"

Write-Host "🚑 Railway Emergency Fix Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# ============================================================================
# 1. Check Railway CLI
# ============================================================================
Write-Host "📋 Checking Railway CLI..." -ForegroundColor Yellow

$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI not installed" -ForegroundColor Red
    Write-Host "   Install: npm i -g @railway/cli" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Railway CLI installed`n" -ForegroundColor Green

# ============================================================================
# 2. Check Authentication
# ============================================================================
Write-Host "📋 Checking Railway authentication..." -ForegroundColor Yellow

$authTest = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with Railway" -ForegroundColor Red
    Write-Host "   Run: railway login" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Authenticated: $authTest`n" -ForegroundColor Green

# ============================================================================
# 3. Get Current Variables
# ============================================================================
Write-Host "📋 Fetching current environment variables..." -ForegroundColor Yellow

$varsOutput = railway variables --json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Failed to fetch variables (network issue?)" -ForegroundColor Yellow
    Write-Host "   Continuing with manual checks...`n" -ForegroundColor Gray
    $vars = @{}
}
else {
    try {
        $vars = $varsOutput | ConvertFrom-Json -AsHashtable
        Write-Host "✅ Fetched $($vars.Count) variables`n" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Failed to parse variables JSON" -ForegroundColor Yellow
        $vars = @{}
    }
}

# ============================================================================
# 4. Critical Variables Check
# ============================================================================
Write-Host "📋 Critical Variables Check" -ForegroundColor Yellow
Write-Host "========================`n" -ForegroundColor Yellow

$issues = @()
$fixes = @()

# DATABASE_URL
if (-not $vars.ContainsKey("DATABASE_URL") -or [string]::IsNullOrWhiteSpace($vars.DATABASE_URL)) {
    Write-Host "❌ DATABASE_URL: MISSING" -ForegroundColor Red
    $issues += "DATABASE_URL is missing"
    $fixes += @{
        command     = 'railway variables set DATABASE_URL="postgresql://user:pass@host:26257/dbname?sslmode=require"'
        description = "Set DATABASE_URL to your CockroachDB connection string"
        required    = $true
    }
}
elseif ($vars.DATABASE_URL -match '\$\{\{|\}\}|<|>') {
    Write-Host "❌ DATABASE_URL: CONTAINS PLACEHOLDERS" -ForegroundColor Red
    $issues += "DATABASE_URL has placeholder values"
    $fixes += @{
        command     = 'railway variables set DATABASE_URL="postgresql://user:pass@host:26257/dbname?sslmode=require"'
        description = "Replace DATABASE_URL with actual connection string"
        required    = $true
    }
}
else {
    Write-Host "✅ DATABASE_URL: OK" -ForegroundColor Green
}

# JWT_SECRET
if (-not $vars.ContainsKey("JWT_SECRET") -or [string]::IsNullOrWhiteSpace($vars.JWT_SECRET)) {
    Write-Host "❌ JWT_SECRET: MISSING" -ForegroundColor Red
    $issues += "JWT_SECRET is missing"
    
    # Generate a secure random JWT secret
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    
    $fixes += @{
        command     = "railway variables set JWT_SECRET=`"$jwtSecret`""
        description = "Set JWT_SECRET (generated random 64-char string)"
        required    = $true
    }
}
elseif ($vars.JWT_SECRET.Length -lt 32) {
    Write-Host "⚠️  JWT_SECRET: TOO SHORT (should be 32+ chars)" -ForegroundColor Yellow
    $issues += "JWT_SECRET is too short"
}
else {
    Write-Host "✅ JWT_SECRET: OK" -ForegroundColor Green
}

# NODE_ENV
if ($vars.NODE_ENV -ne "production") {
    Write-Host "⚠️  NODE_ENV: $($vars.NODE_ENV) (should be 'production')" -ForegroundColor Yellow
    $fixes += @{
        command     = 'railway variables set NODE_ENV="production"'
        description = "Set NODE_ENV to production"
        required    = $false
    }
}
else {
    Write-Host "✅ NODE_ENV: production" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# 5. Optional/Optimization Variables
# ============================================================================
Write-Host "📋 Optimization Variables" -ForegroundColor Yellow
Write-Host "======================`n" -ForegroundColor Yellow

# AUTH_COOKIE_DOMAIN
if ($vars.ContainsKey("AUTH_COOKIE_DOMAIN") -and -not [string]::IsNullOrWhiteSpace($vars.AUTH_COOKIE_DOMAIN)) {
    if ($vars.AUTH_COOKIE_DOMAIN -match "railway\.app") {
        Write-Host "⚠️  AUTH_COOKIE_DOMAIN: Should be empty for Railway auto-domains" -ForegroundColor Yellow
        $fixes += @{
            command     = "railway variables delete AUTH_COOKIE_DOMAIN"
            description = "Remove AUTH_COOKIE_DOMAIN (let Railway auto-handle)"
            required    = $false
        }
    }
}
else {
    Write-Host "✅ AUTH_COOKIE_DOMAIN: Empty (auto-handled)" -ForegroundColor Green
}

# TRUST_PROXY
if (-not $vars.ContainsKey("TRUST_PROXY") -or $vars.TRUST_PROXY -ne "1") {
    Write-Host "⚠️  TRUST_PROXY: Not set (recommended for Railway)" -ForegroundColor Yellow
    $fixes += @{
        command     = 'railway variables set TRUST_PROXY="1"'
        description = "Enable trust proxy (Railway uses load balancer)"
        required    = $false
    }
}
else {
    Write-Host "✅ TRUST_PROXY: 1" -ForegroundColor Green
}

# PGPOOL_MAX
if (-not $vars.ContainsKey("PGPOOL_MAX") -or $vars.PGPOOL_MAX -ne "5") {
    Write-Host "⚠️  PGPOOL_MAX: Not set (recommended: 5 for Railway free tier)" -ForegroundColor Yellow
    $fixes += @{
        command     = 'railway variables set PGPOOL_MAX="5"'
        description = "Limit PostgreSQL pool to 5 connections (Railway 512MB RAM)"
        required    = $false
    }
}
else {
    Write-Host "✅ PGPOOL_MAX: 5" -ForegroundColor Green
}

# AUTH_COOKIE_SAMESITE
$sameSite = $vars.AUTH_COOKIE_SAMESITE
if ($sameSite -eq "strict") {
    Write-Host "⚠️  AUTH_COOKIE_SAMESITE: strict (may block cross-domain)" -ForegroundColor Yellow
    $fixes += @{
        command     = 'railway variables set AUTH_COOKIE_SAMESITE="lax"'
        description = "Change to 'lax' for better compatibility"
        required    = $false
    }
}
elseif ($sameSite -eq "lax" -or [string]::IsNullOrWhiteSpace($sameSite)) {
    Write-Host "✅ AUTH_COOKIE_SAMESITE: lax (or default)" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# 6. Summary & Fix Actions
# ============================================================================
if ($issues.Count -eq 0 -and $fixes.Count -eq 0) {
    Write-Host "✅ No issues found! Configuration looks good." -ForegroundColor Green
    exit 0
}

Write-Host "`n📊 Summary" -ForegroundColor Cyan
Write-Host "========`n" -ForegroundColor Cyan
Write-Host "Issues found: $($issues.Count)" -ForegroundColor Yellow
Write-Host "Fixes available: $($fixes.Count)`n" -ForegroundColor Yellow

if ($issues.Count -gt 0) {
    Write-Host "Issues:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    Write-Host ""
}

# ============================================================================
# 7. Apply Fixes
# ============================================================================
if ($fixes.Count -gt 0) {
    Write-Host "🔧 Recommended Fixes:" -ForegroundColor Cyan
    Write-Host "==================`n" -ForegroundColor Cyan
    
    for ($i = 0; $i -lt $fixes.Count; $i++) {
        $fix = $fixes[$i]
        $required = if ($fix.required) { "[REQUIRED]" } else { "[OPTIONAL]" }
        
        Write-Host "[$($i + 1)] $required $($fix.description)" -ForegroundColor Yellow
        Write-Host "    $($fix.command)`n" -ForegroundColor Gray
    }
    
    if ($AutoFix) {
        Write-Host "`n⚡ Auto-fixing issues..." -ForegroundColor Cyan
        
        foreach ($fix in $fixes) {
            Write-Host "Executing: $($fix.description)" -ForegroundColor Yellow
            
            try {
                Invoke-Expression $fix.command
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Fixed: $($fix.description)`n" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ Failed: $($fix.description)`n" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ Error: $($_.Exception.Message)`n" -ForegroundColor Red
            }
        }
        
        Write-Host "`n✅ Auto-fix completed!" -ForegroundColor Green
        Write-Host "   Run 'railway up' or push to Git to redeploy`n" -ForegroundColor Gray
        
    }
    else {
        Write-Host "`n💡 To apply fixes automatically, run:" -ForegroundColor Cyan
        Write-Host "   .\railway-emergency-fix.ps1 -AutoFix`n" -ForegroundColor Gray
        
        Write-Host "   Or manually copy-paste the commands above`n" -ForegroundColor Gray
    }
}

# ============================================================================
# 8. Additional Checks
# ============================================================================
Write-Host "`n📋 Additional Checks" -ForegroundColor Yellow
Write-Host "==================`n" -ForegroundColor Yellow

# Check service health
Write-Host "Checking service health..." -ForegroundColor Gray
$healthUrl = "https://contesthub.homelabo.work/api/health/ready"

try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
    
    if ($response.ready -eq $true) {
        Write-Host "✅ Service is healthy and ready`n" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Service is not ready" -ForegroundColor Yellow
        Write-Host "   Checks: $($response.checks | ConvertTo-Json -Compress)`n" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ Service health check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Gray
}

Write-Host "✅ Emergency diagnostics complete!`n" -ForegroundColor Cyan
