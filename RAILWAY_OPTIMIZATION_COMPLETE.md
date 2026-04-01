# 🚀 Railway Deployment Optimization - Complete

## ✅ Optimizations Applied

### 1. **Database Connection Pool (server/lib/db.js)**
- ✅ Railway-aware pool sizing: **5 connections** for free tier (512MB RAM)
- ✅ Production idle timeout: **60 seconds** (vs 30s in dev)
- ✅ Slow query logging (>1000ms) for performance monitoring
- ✅ Graceful error handling with detailed diagnostics

### 2. **Redis Connection (server/lib/cache.js)**
- ✅ Railway-optimized timeouts: 10s connect, 5s command
- ✅ Maximum 3 retry attempts (prevents infinite loops)
- ✅ IPv4 forced (Railway compatibility)
- ✅ Keep-alive enabled in production (30s)
- ✅ Graceful failure without crashing app

### 3. **Health Check Endpoints (server/routes/health.js)**
- ✅ `/api/health` - Always returns 200 with degraded status
- ✅ `/api/health/ready` - Returns 503 if not ready (Railway healthcheck)
- ✅ `/api/health/debug-env` - Debug endpoint for troubleshooting
- ✅ Detailed diagnostics: DATABASE_URL validation, placeholder detection, schema checks

### 4. **Startup Validation (server/index.js)**
- ✅ Critical variable check on startup (DATABASE_URL, JWT_SECRET)
- ✅ Placeholder value detection (${{...}}, <...>)
- ✅ Fail-fast with clear error messages
- ✅ Railway environment detection

### 5. **Railway Configuration (railway.toml)**
- ✅ Auto-run migrations on deployment
- ✅ Healthcheck path: `/api/health/ready`
- ✅ 30s initial delay for startup
- ✅ 300s healthcheck timeout
- ✅ Restart policy: ON_FAILURE with 10 retries

### 6. **Emergency Fix Tools**
- ✅ `scripts/railway-emergency-fix.ps1` - Auto-diagnose and fix Railway issues
- ✅ `scripts/check-railway-vars.ps1` - Verify environment variables
- ✅ `server/scripts/fix-platform-settings.js` - Fix database settings
- ✅ `server/scripts/validate-env.js` - Comprehensive startup validation

---

## 📦 Deployment Steps

### Step 1: Commit and Push
```powershell
git add -A
git commit -m "✨ Railway deployment optimization complete"
git push origin main
```

### Step 2: Verify Railway Variables
```powershell
# Run emergency fix script
.\scripts\railway-emergency-fix.ps1

# Or manually check variables
railway variables

# Required variables:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (32+ characters)
# - NODE_ENV=production

# Recommended variables:
# - TRUST_PROXY=1
# - PGPOOL_MAX=5
# - AUTH_COOKIE_SAMESITE=lax
# - AUTH_COOKIE_DOMAIN (should be EMPTY for Railway)
```

### Step 3: Monitor Deployment
```powershell
# Watch deployment logs
railway logs --tail 100

# Check health status
curl https://contesthub.homelabo.work/api/health/ready

# Debug if needed
curl https://contesthub.homelabo.work/api/health/debug-env
```

### Step 4: Run Platform Settings Fix (if needed)
```powershell
# Fix maintenance mode and session timeout
railway run node server/scripts/fix-platform-settings.js
```

---

## 🔍 Troubleshooting

### Issue: DATABASE_URL not set
**Symptom:** Health check returns `hasDATABASE_URL: false`

**Fix:**
```powershell
# Check if variable exists
railway variables

# Set DATABASE_URL if missing
railway variables set DATABASE_URL="postgresql://user:pass@host:26257/ContestHub?sslmode=require"

# Redeploy
railway up
```

### Issue: Healthcheck timeout
**Symptom:** Railway shows "Service is unhealthy"

**Possible causes:**
1. DATABASE_URL not injected into container
2. Database connection slow (>30s)
3. Migrations taking too long

**Fix:**
```powershell
# Check logs
railway logs --tail 200

# Increase initial delay in railway.toml
# initialDelaySeconds = 60  # (already 30s)

# Or temporarily disable healthcheck to see actual error
# Comment out healthcheckPath in railway.toml
```

### Issue: Redis connection errors
**Symptom:** Logs show "Redis connection failed after 3 attempts"

**Fix:**
```powershell
# Redis is optional - app will work without it
# To fix, set REDIS_URL in Railway:
railway variables set REDIS_URL="redis://host:6379"

# Or remove REDIS_URL to disable caching
railway variables delete REDIS_URL
```

### Issue: Session timeout too short
**Symptom:** Users logged out after 30 minutes

**Fix:**
```powershell
# Run platform settings fix
railway run node server/scripts/fix-platform-settings.js

# This sets sessionTimeout to 1440 minutes (24 hours)
```

---

## 📊 Performance Metrics

### Expected Performance (Railway Free Tier)
- **Startup time:** 20-40 seconds (includes migrations)
- **Health check response:** <100ms
- **Database query (simple):** 50-150ms (CockroachDB in AWS ap-southeast-1)
- **Database query (complex):** 200-500ms
- **Memory usage:** 100-200MB (Node.js)
- **Connection pool:** 5 connections max

### Monitoring Commands
```powershell
# Check service health
curl https://contesthub.homelabo.work/api/health

# Check readiness (detailed)
curl https://contesthub.homelabo.work/api/health/ready

# Debug environment variables
curl https://contesthub.homelabo.work/api/health/debug-env

# Railway metrics
railway status
railway logs --tail 100
```

---

## 🎯 Next Steps (Optional)

1. **Enable Monitoring**
   - Set up Railway alerts for healthcheck failures
   - Monitor slow query logs (>1000ms)
   - Track memory usage trends

2. **Database Optimization**
   - Run index migration: `railway run node server/scripts/run-migrations.js`
   - Verify indexes: Check `server/scripts/migrations/001_add_performance_indexes.sql`

3. **Security Hardening**
   - Rotate JWT_SECRET periodically
   - Review CORS settings for production domains
   - Enable rate limiting (if not already)

4. **Documentation**
   - Update team wiki with deployment process
   - Document emergency procedures
   - Create runbook for common issues

---

## 📞 Emergency Contacts

### Critical Commands
```powershell
# Emergency rollback
git revert HEAD
git push origin main

# Emergency fix script
.\scripts\railway-emergency-fix.ps1 -AutoFix

# Restart service
railway restart

# Check all variables
.\scripts\check-railway-vars.ps1

# Local database test
node test-db.mjs
```

### Log Analysis
```powershell
# Search for errors
railway logs | Select-String "ERROR"

# Search for slow queries
railway logs | Select-String "⚠️.*slow query"

# Search for connection issues
railway logs | Select-String "connection|timeout"
```

---

## ✅ Deployment Checklist

- [ ] Commit all changes to Git
- [ ] Run `.\scripts\railway-emergency-fix.ps1` to verify variables
- [ ] Push to main branch (triggers auto-deploy)
- [ ] Monitor deployment logs (`railway logs --tail 100`)
- [ ] Verify health endpoint returns `{"ready": true}`
- [ ] Test authentication flow
- [ ] Run platform settings fix if needed
- [ ] Update documentation

---

**Date:** 2025-01-08  
**Version:** v2.0  
**Status:** ✅ READY FOR DEPLOYMENT
