#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verify Railway 3-Service Setup (Backend, Frontend, Admin)

.DESCRIPTION
    Tests health checks, CORS, CSRF endpoints, and environment configuration
    for the ContestHub Railway deployment.

.EXAMPLE
    .\verify-railway-setup.ps1
    .\verify-railway-setup.ps1 -BackendUrl "https://api.yourdomain.com" -FrontendUrl "https://app.yourdomain.com" -AdminUrl "https://admin.yourdomain.com"
#>

param(
    [string]$BackendUrl = "https://contesthub.homelabo.work",
    [string]$FrontendUrl = "",
    [string]$AdminUrl = ""
)

$ErrorActionPreference = "Continue"
Write-Host "`n🔍 Verifying Railway 3-Service Setup..." -ForegroundColor Cyan
Write-Host "=" * 60

# Colors
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Failure { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }

# Test counter
$script:passCount = 0
$script:failCount = 0
$script:warnCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [string]$ExpectedContent = $null
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10 -UseBasicParsing
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            if ($ExpectedContent -and $response.Content -notmatch $ExpectedContent) {
                Write-Failure "$Name - Status OK but content mismatch"
                $script:failCount++
                return $false
            }
            Write-Success "$Name - Status: $($response.StatusCode)"
            $script:passCount++
            return $true
        }
        else {
            Write-Failure "$Name - Expected $ExpectedStatus, got $($response.StatusCode)"
            $script:failCount++
            return $false
        }
    }
    catch {
        Write-Failure "$Name - $($_.Exception.Message)"
        $script:failCount++
        return $false
    }
}

# ============================================================================
# TEST 1: BACKEND HEALTH CHECKS
# ============================================================================
Write-Host "`n📊 Test 1: Backend Health Checks" -ForegroundColor Yellow
Write-Host "-" * 60

try {
    $health = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method Get -TimeoutSec 10
    
    Write-Info "Status: $($health.status)"
    Write-Info "Database: $($health.services.database)"
    Write-Info "Redis: $($health.services.redis)"
    Write-Info "Database Configured: $($health.databaseConfig.configured)"
    
    if ($health.databaseConfig.configured -eq $true) {
        Write-Success "Database configuration OK"
        $script:passCount++
    }
    else {
        Write-Failure "Database not configured (DATABASE_URL missing in Railway variables)"
        $script:failCount++
        Write-Warning "Fix: Railway Dashboard → Backend Service → Variables → Add DATABASE_URL"
    }
    
    if ($health.services.database -eq "healthy") {
        Write-Success "Database connection healthy"
        $script:passCount++
    }
    else {
        Write-Failure "Database connection: $($health.services.database)"
        $script:failCount++
    }
    
    # Test readiness endpoint
    Test-Endpoint -Name "Readiness Check" -Url "$BackendUrl/api/health/ready" -ExpectedStatus 200
    
}
catch {
    Write-Failure "Health check failed: $($_.Exception.Message)"
    $script:failCount++
}

# ============================================================================
# TEST 2: CSRF ENDPOINT
# ============================================================================
Write-Host "`n🔒 Test 2: CSRF Token Endpoint" -ForegroundColor Yellow
Write-Host "-" * 60

try {
    $csrf = Invoke-RestMethod -Uri "$BackendUrl/api/auth/csrf" -Method Get -TimeoutSec 10
    
    if ($csrf.csrfToken -and $csrf.csrfToken.Length -gt 10) {
        Write-Success "CSRF endpoint working - Token: $($csrf.csrfToken.Substring(0, 10))..."
        $script:passCount++
    }
    else {
        Write-Failure "CSRF token invalid or missing"
        $script:failCount++
    }
}
catch {
    Write-Failure "CSRF endpoint failed: $($_.Exception.Message)"
    $script:failCount++
    Write-Warning "This endpoint is required for cross-domain Admin authentication"
}

# ============================================================================
# TEST 3: CORS CONFIGURATION
# ============================================================================
Write-Host "`n🔗 Test 3: CORS Configuration" -ForegroundColor Yellow
Write-Host "-" * 60

if ($AdminUrl) {
    try {
        $headers = @{
            'Origin' = $AdminUrl
        }
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/contests" -Method Options -Headers $headers -TimeoutSec 10 -UseBasicParsing
        
        $corsHeader = $response.Headers['Access-Control-Allow-Origin']
        if ($corsHeader -and ($corsHeader -eq $AdminUrl -or $corsHeader -eq '*')) {
            Write-Success "CORS configured for Admin: $corsHeader"
            $script:passCount++
        }
        else {
            Write-Failure "CORS not allowing Admin origin"
            Write-Info "Expected: $AdminUrl"
            Write-Info "Got: $corsHeader"
            $script:failCount++
            Write-Warning "Fix: Update FRONTEND_ORIGIN in Backend Railway variables"
        }
    }
    catch {
        Write-Warning "CORS preflight test skipped (might need authentication)"
        $script:warnCount++
    }
}
else {
    Write-Warning "Admin URL not provided, skipping CORS test"
    Write-Info "Usage: .\verify-railway-setup.ps1 -AdminUrl https://admin.yourdomain.com"
    $script:warnCount++
}

# ============================================================================
# TEST 4: ENVIRONMENT VARIABLES CHECK
# ============================================================================
Write-Host "`n⚙️  Test 4: Environment Variables" -ForegroundColor Yellow
Write-Host "-" * 60

try {
    $debugEnv = Invoke-RestMethod -Uri "$BackendUrl/api/health/debug-env" -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue
    
    if ($debugEnv) {
        Write-Info "DATABASE_URL present: $($debugEnv.hasDATABASE_URL)"
        Write-Info "REDIS_URL present: $($debugEnv.hasREDIS_URL)"
        Write-Info "NODE_ENV: $($debugEnv.NODE_ENV)"
        
        if ($debugEnv.hasDATABASE_URL) {
            Write-Success "DATABASE_URL configured"
            $script:passCount++
        }
        else {
            Write-Failure "DATABASE_URL not set in Railway"
            $script:failCount++
        }
    }
    else {
        Write-Warning "Debug endpoint not available (might be removed in production)"
        $script:warnCount++
    }
}
catch {
    Write-Warning "Environment debug endpoint not accessible"
    $script:warnCount++
}

# ============================================================================
# TEST 5: API ENDPOINTS SMOKE TEST
# ============================================================================
Write-Host "`n🔥 Test 5: API Endpoints Smoke Test" -ForegroundColor Yellow
Write-Host "-" * 60

Test-Endpoint -Name "Contests List" -Url "$BackendUrl/api/contests" -ExpectedStatus 200
Test-Endpoint -Name "News List" -Url "$BackendUrl/api/news" -ExpectedStatus 200
Test-Endpoint -Name "Courses List" -Url "$BackendUrl/api/courses" -ExpectedStatus 200

# Test protected endpoints (should return 401 without auth)
try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/me" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Failure "Protected endpoint /auth/me returned $($response.StatusCode) (should be 401)"
    $script:failCount++
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Success "Protected endpoint correctly requires authentication"
        $script:passCount++
    }
    else {
        Write-Warning "Protected endpoint returned unexpected error"
        $script:warnCount++
    }
}

# ============================================================================
# TEST 6: FRONTEND/ADMIN HEALTH (if URLs provided)
# ============================================================================
if ($FrontendUrl -or $AdminUrl) {
    Write-Host "`n🌐 Test 6: Frontend/Admin Health" -ForegroundColor Yellow
    Write-Host "-" * 60
    
    if ($FrontendUrl) {
        Test-Endpoint -Name "Frontend Health" -Url "$FrontendUrl/health" -ExpectedStatus 200
    }
    
    if ($AdminUrl) {
        Test-Endpoint -Name "Admin Health" -Url "$AdminUrl/health" -ExpectedStatus 200
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📋 VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$total = $script:passCount + $script:failCount + $script:warnCount
$passPercent = if ($total -gt 0) { [math]::Round(($script:passCount / $total) * 100, 1) } else { 0 }

Write-Host ""
Write-Success "Passed: $($script:passCount)"
Write-Failure "Failed: $($script:failCount)"
Write-Warning "Warnings: $($script:warnCount)"
Write-Host ""

if ($script:failCount -eq 0) {
    Write-Host "🎉 All critical tests passed! ($passPercent% success rate)" -ForegroundColor Green
    exit 0
}
elseif ($script:failCount -le 2) {
    Write-Host "⚠️  Minor issues detected ($passPercent% success rate)" -ForegroundColor Yellow
    Write-Host "Review failures above and fix in Railway Dashboard" -ForegroundColor Yellow
    exit 1
}
else {
    Write-Host "❌ Critical issues detected ($passPercent% success rate)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Check DATABASE_URL in Railway Backend Variables" -ForegroundColor White
    Write-Host "2. Verify FRONTEND_ORIGIN includes all domains (Frontend + Admin)" -ForegroundColor White
    Write-Host "3. Ensure Redis is either configured or REDIS_URL removed" -ForegroundColor White
    Write-Host "4. Check service is using correct Dockerfile and environment" -ForegroundColor White
    exit 2
}
