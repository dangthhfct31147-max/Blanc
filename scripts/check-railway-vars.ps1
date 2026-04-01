#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verify and auto-fix Railway environment variables for optimal performance

.DESCRIPTION
    Checks critical environment variables and provides fix commands
    for common misconfigurations that cause connection/session issues
#>

param(
    [switch]$AutoFix = $false,
    [string]$Service = "contesthub-backend"
)

$ErrorActionPreference = "Continue"

Write-Host "`n🔍 Checking Railway Variables Configuration..." -ForegroundColor Cyan
Write-Host "=" * 70

# Variables to check
$requiredVars = @{
    "DATABASE_URL" = @{
        Required    = $true
        Pattern     = "^postgresql://"
        Description = "PostgreSQL/CockroachDB connection string"
    }
    "JWT_SECRET"   = @{
        Required    = $true
        MinLength   = 32
        Description = "JWT signing secret (min 32 characters)"
    }
    "NODE_ENV"     = @{
        Required      = $true
        ExpectedValue = "production"
        Description   = "Node environment"
    }
}

$optimalVars = @{
    "AUTH_COOKIE_DOMAIN"   = @{
        ExpectedValue = ""
        Description   = "Should be EMPTY for Railway auto-domain handling"
        Action        = "delete"
    }
    "AUTH_COOKIE_SAMESITE" = @{
        ExpectedValue = "lax"
        Description   = "Must be 'lax' for cross-domain cookies"
    }
    "AUTH_COOKIE_SECURE"   = @{
        ExpectedValue = "true"
        Description   = "Must be true for HTTPS"
    }
    "TRUST_PROXY"          = @{
        ExpectedValue = "1"
        Description   = "Trust Railway load balancer"
    }
    "PGPOOL_MAX"           = @{
        ExpectedValue = "5"
        Description   = "Connection pool size (Railway free tier optimized)"
    }
    "PGPOOL_IDLE_MS"       = @{
        ExpectedValue = "60000"
        Description   = "Idle timeout (60 seconds)"
    }
    "FRONTEND_ORIGIN"      = @{
        Pattern     = "^https://"
        Description = "Comma-separated frontend/admin URLs"
    }
}

$issues = @()
$fixes = @()

# Check if Railway CLI is available
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "   Install: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    railway whoami 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
        Write-Host "   Run: railway login" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host "❌ Railway CLI error" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Checking required variables..." -ForegroundColor Yellow

# Get all variables
$allVars = railway variables --kv 2>&1 | Out-String

foreach ($varName in $requiredVars.Keys) {
    $config = $requiredVars[$varName]
    
    if ($allVars -match "$varName=(.+)") {
        $value = $Matches[1].Trim()
        
        if ($config.Pattern -and $value -notmatch $config.Pattern) {
            Write-Host "⚠️  $varName - Invalid format" -ForegroundColor Red
            $issues += "$varName has invalid format"
        }
        elseif ($config.MinLength -and $value.Length -lt $config.MinLength) {
            Write-Host "⚠️  $varName - Too short (length: $($value.Length))" -ForegroundColor Red
            $issues += "$varName is too short"
        }
        elseif ($config.ExpectedValue -and $value -ne $config.ExpectedValue) {
            Write-Host "⚠️  $varName = $value (expected: $($config.ExpectedValue))" -ForegroundColor Yellow
            $fixes += "railway variables set ${varName}=`"$($config.ExpectedValue)`""
        }
        else {
            Write-Host "✅ $varName - OK" -ForegroundColor Green
        }
    }
    else {
        Write-Host "❌ $varName - MISSING" -ForegroundColor Red
        $issues += "$varName is not set"
        Write-Host "   $($config.Description)" -ForegroundColor Gray
    }
}

Write-Host "`n⚙️  Checking optimal configuration..." -ForegroundColor Yellow

foreach ($varName in $optimalVars.Keys) {
    $config = $optimalVars[$varName]
    
    if ($allVars -match "$varName=(.+)") {
        $value = $Matches[1].Trim()
        
        if ($config.Action -eq "delete") {
            Write-Host "⚠️  $varName - Should be deleted" -ForegroundColor Yellow
            Write-Host "   Current value: $value" -ForegroundColor Gray
            Write-Host "   $($config.Description)" -ForegroundColor Gray
            $fixes += "# Delete $varName (Railway Dashboard → Variables → Remove)"
        }
        elseif ($config.ExpectedValue -and $value -ne $config.ExpectedValue) {
            Write-Host "⚠️  $varName = $value (recommended: $($config.ExpectedValue))" -ForegroundColor Yellow
            $fixes += "railway variables set ${varName}=`"$($config.ExpectedValue)`""
        }
        elseif ($config.Pattern -and $value -notmatch $config.Pattern) {
            Write-Host "⚠️  $varName - Check format" -ForegroundColor Yellow
            Write-Host "   $($config.Description)" -ForegroundColor Gray
        }
        else {
            Write-Host "✅ $varName - OK" -ForegroundColor Green
        }
    }
    else {
        if ($config.ExpectedValue) {
            Write-Host "⚠️  $varName - Not set (recommended)" -ForegroundColor Yellow
            $fixes += "railway variables set ${varName}=`"$($config.ExpectedValue)`""
        }
    }
}

# Summary
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "📋 SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "`n✅ All required variables are configured!" -ForegroundColor Green
}
else {
    Write-Host "`n❌ Issues found:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
}

if ($fixes.Count -gt 0) {
    Write-Host "`n🔧 Recommended fixes:" -ForegroundColor Yellow
    Write-Host ""
    $fixes | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
    
    if ($AutoFix) {
        Write-Host "`n⚠️  Auto-fix is enabled but manual verification required for:" -ForegroundColor Yellow
        Write-Host "   - DATABASE_URL (must be valid connection string)" -ForegroundColor White
        Write-Host "   - FRONTEND_ORIGIN (must include all domains)" -ForegroundColor White
        Write-Host "`nPlease run commands above manually after verification." -ForegroundColor Yellow
    }
}

Write-Host ""

# Exit code
if ($issues.Count -gt 0) {
    exit 1
}
elseif ($fixes.Count -gt 0) {
    exit 2  # Has recommendations
}
else {
    exit 0  # All good
}
