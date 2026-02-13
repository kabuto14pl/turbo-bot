# 🧹 CLEANUP GUIDE - Turbo Bot

**Created**: 2025-01-10  
**Purpose**: Safe cleanup of old/unused/redundant files  
**Strategy**: Archive first, delete second, validate always

---

## 📋 OVERVIEW

Based on **TIER 1-3.3 implementation** and **workflow analysis**, identified:
- **~120 CRITICAL files** to KEEP
- **~80+ OLD files** to DELETE/ARCHIVE
- **Full inventory**: See `CRITICAL_FILES_INVENTORY.md`

---

## 🎯 WHAT WILL BE CLEANED

### ✅ SAFE TO DELETE (Automated):
- **PID files**: bot.pid, bot_test.pid, etc. (runtime only)
- **Cache files**: CacheService, CacheTest
- **Old dashboards**: 5+ old JSON configs, HTML, Python servers
- **Old documentation**: 15+ old audit/diagnostic/codespace docs
- **Old scripts**: 10+ audit/cleanup/debug/deploy scripts

### ⚠️ REQUIRES CONFIRMATION (Manual):
- **Old main files**: main.ts, main_test_mode.ts, main_production.ts (replaced by autonomous_trading_bot_final.ts)
- **Old tests**: basic_enterprise_test.ts, enterprise_ml_test.js
- **Duplicate processors**: kafka_duckdb_processor_fixed.ts
- **Old Docker files**: docker-compose.codespace.yml, Dockerfile

### ❌ WILL NOT DELETE:
- **autonomous_trading_bot_final.ts** (MAIN BOT)
- **TIER 1-3 systems** (all active code)
- **Configuration**: .env, package.json, tsconfig.json
- **Active data**: trading-bot/data/, logs/, node_modules/
- **Critical docs**: README.md, copilot-instructions.md, TIER_3_3_BOT_INTEGRATION_COMPLETE.md

---

## 🚀 HOW TO RUN CLEANUP

### **Option 1: Automated Safe Cleanup** (RECOMMENDED)

```bash
# From project root
./safe_cleanup.sh
```

**What it does**:
1. ✅ **Validates** you're in correct directory
2. 📦 **Creates full backup** (excludes node_modules, .git, *.log)
3. 📁 **Creates archive directory** (archive/cleanup_YYYYMMDD/)
4. 🗑️ **Deletes safe files** (PID, cache)
5. 📚 **Archives old docs** (moves to archive/old_docs/)
6. 📊 **Archives old dashboards** (moves to archive/old_dashboards/)
7. 🔧 **Archives old scripts** (moves to archive/old_scripts/)
8. ⚠️ **Asks confirmation** for old code deletion
9. ⚠️ **Asks confirmation** for Docker cleanup
10. ✅ **Validates** critical files still exist
11. 📝 **Shows summary** and next steps

### **Option 2: Manual Review First**

```bash
# 1. Review what will be deleted
cat CRITICAL_FILES_INVENTORY.md

# 2. Check current files
ls -la

# 3. Create manual backup
tar -czf manual_backup_$(date +%Y%m%d).tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    .

# 4. Run cleanup
./safe_cleanup.sh
```

### **Option 3: Dry Run** (See what would happen)

```bash
# Edit safe_cleanup.sh and add at top:
DRY_RUN=true

# Then run
./safe_cleanup.sh
```

---

## 📊 CLEANUP PHASES

### **Phase 0: Pre-flight Checks**
- Validates package.json exists
- Validates autonomous_trading_bot_final.ts exists
- Exits if validation fails

### **Phase 1: Create Full Backup**
- Location: `backups/backup_before_cleanup_YYYYMMDD_HHMMSS.tar.gz`
- Excludes: node_modules, .git, *.duckdb, *.log
- Exits if backup fails

### **Phase 2: Create Archive Directory**
- Location: `archive/cleanup_YYYYMMDD/`
- Subdirectories: old_docs, old_code, old_tests, old_dashboards, old_scripts

### **Phase 3: Safe Deletion**
- PID files: *.pid
- Cache files: CacheService, CacheTest
- No confirmation required

### **Phase 4: Archive Old Documentation**
- 15+ old audit/diagnostic/codespace docs
- Copied to archive, then deleted
- No confirmation required

### **Phase 5: Archive Old Dashboards**
- 5+ old dashboard JSON configs
- Old HTML/Python servers/proxies
- No confirmation required

### **Phase 6: Archive Old Scripts**
- Audit scripts: audit_bot_comprehensive.*, analyze_*.sh
- Cleanup scripts: cleanup_*.sh, deep_cleanup.sh
- Debug scripts: debug_*.*, check_ml_infrastructure.*
- Deployment scripts: deploy_*.sh, configure_redis.sh
- No confirmation required

### **Phase 7: Archive Old Code** ⚠️ **REQUIRES CONFIRMATION**
- Old main files: main.ts, main_test_mode.ts, main_production.ts
- Old test files: basic_enterprise_test.*, enterprise_ml_test.js
- Duplicate processors: kafka_duckdb_processor_fixed.*

### **Phase 8: Archive Old Docker** ⚠️ **REQUIRES CONFIRMATION**
- docker-compose.codespace.yml
- Dockerfile

### **Phase 9: Summary & Validation**
- Shows cleanup statistics
- Validates critical files still exist
- Exits with error if validation fails

### **Phase 10: Post-Cleanup Recommendations**
- Next steps: npm run build, npm run test
- Restore instructions if needed
- Git commit reminder

---

## 🔄 AFTER CLEANUP

### **Immediate Validation**:

```bash
# 1. Compile TypeScript
npm run build

# 2. Run tests (if available)
npm run test

# 3. Verify bot starts
npm exec ts-node trading-bot/autonomous_trading_bot_final.ts

# Should see:
# ✅ FINALNA WERSJA with Enterprise ML + Working Monitoring initialized
# 🧠 Ensemble Predictions: ACTIVE (3 models)
# 📊 Portfolio Optimization: ACTIVE (Markowitz)
# 🧪 Backtesting Engine: READY
```

### **Git Management**:

```bash
# 1. Check status
git status

# 2. Review changes
git diff

# 3. Stage changes
git add .

# 4. Commit
git commit -m "chore: cleanup old/unused files - archived to archive/cleanup_$(date +%Y%m%d)"

# 5. Push (if desired)
git push origin master
```

### **Archive Management**:

```bash
# Review archived files
ls -la archive/cleanup_YYYYMMDD/

# Archive subdirectories:
archive/cleanup_YYYYMMDD/
├── old_docs/          # Old documentation
├── old_code/          # Old main files, tests
├── old_tests/         # Old test files
├── old_dashboards/    # Old dashboard configs
└── old_scripts/       # Old audit/cleanup/debug scripts

# Keep archive for 30 days, then consider deletion
# Or compress further:
tar -czf archive_YYYYMMDD.tar.gz archive/cleanup_YYYYMMDD/
rm -rf archive/cleanup_YYYYMMDD/
```

---

## 🆘 TROUBLESHOOTING

### **Problem: Validation Failed After Cleanup**

```bash
# Restore from backup
cd /workspaces/turbo-bot
tar -xzf backups/backup_before_cleanup_YYYYMMDD_HHMMSS.tar.gz

# Verify restoration
ls -la trading-bot/autonomous_trading_bot_final.ts
```

### **Problem: Accidentally Deleted Critical File**

```bash
# Option 1: Restore from backup
tar -xzf backups/backup_before_cleanup_YYYYMMDD_HHMMSS.tar.gz

# Option 2: Restore from archive
cp archive/cleanup_YYYYMMDD/old_code/FILENAME .

# Option 3: Restore from git
git checkout HEAD -- FILENAME
```

### **Problem: Bot Won't Start After Cleanup**

```bash
# 1. Check for missing imports
npm run build 2>&1 | grep "Cannot find module"

# 2. Restore from backup if needed
tar -xzf backups/backup_before_cleanup_YYYYMMDD_HHMMSS.tar.gz

# 3. Validate all TIER files exist
cat CRITICAL_FILES_INVENTORY.md | grep "✅" | wc -l
# Should be ~120 files
```

### **Problem: Need Specific File from Archive**

```bash
# Find file in archive
find archive/ -name "FILENAME"

# Copy back to original location
cp archive/cleanup_YYYYMMDD/old_code/FILENAME original/path/
```

---

## 📈 EXPECTED RESULTS

### **Before Cleanup**:
```
Total files: ~300+
Project size: ~150MB (excluding node_modules)
Confusing old files: ~80+
```

### **After Cleanup**:
```
Total files: ~220
Project size: ~100MB (excluding node_modules)
Clean structure: Only active TIER 1-3 files
Archive size: ~30MB (compressed)
Backup size: ~40MB (compressed)
```

### **Benefits**:
- ✅ **Clearer structure** - only active files visible
- ✅ **Faster navigation** - less clutter
- ✅ **Better git diffs** - no old file noise
- ✅ **Reduced confusion** - one main bot file (autonomous_trading_bot_final.ts)
- ✅ **Safer development** - archived files recoverable
- ✅ **Better backups** - smaller, focused backups

---

## ⚠️ WARNINGS

### **DO NOT DELETE**:
- ❌ `.env` - Contains API keys and configuration
- ❌ `package.json` - Dependencies and scripts
- ❌ `tsconfig.json` - TypeScript configuration
- ❌ `.gitignore` - Git configuration
- ❌ `.github/copilot-instructions.md` - AI agent instructions
- ❌ `node_modules/` - Dependencies
- ❌ `trading-bot/data/` - Market data
- ❌ `trading-bot/logs/` - Log files
- ❌ `*.duckdb` - Database files

### **ALWAYS BACKUP FIRST**:
- Script creates automatic backup
- Keep backup for at least 30 days
- Test restoration before considering cleanup permanent

### **CONFIRMATION REQUIRED FOR**:
- Old code files (main.ts, tests)
- Docker files
- Any file you're unsure about

---

## 📝 NOTES

1. **Archive ≠ Delete**: Files are copied to archive before deletion
2. **Backup is King**: Full backup created before any deletion
3. **Validation**: Script validates critical files after cleanup
4. **Reversible**: All deletions can be undone from backup/archive
5. **Incremental**: Can run multiple times safely (idempotent)

---

## 🎯 QUICK START

```bash
# Just run this - it's safe!
./safe_cleanup.sh

# Follow prompts
# Review summary
# Validate bot still works
# Commit changes
```

**That's it!** The script handles everything safely with backups and validation.

---

**🚨 REMEMBER**: When in doubt, ARCHIVE instead of DELETE. The script does this automatically.

**Status**: Ready for safe cleanup execution with full backup strategy.
