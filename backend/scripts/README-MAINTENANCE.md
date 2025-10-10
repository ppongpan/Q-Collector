# Maintenance Scripts Quick Reference

**Q-Collector Migration System v0.8.0**

## Available Scripts

### 1. sync-existing-dynamic-tables.js
Backfill migration records for pre-v0.8.0 tables
```bash
node backend/scripts/sync-existing-dynamic-tables.js --dry-run
node backend/scripts/sync-existing-dynamic-tables.js
```

### 2. cleanup-old-backups.js
Delete expired field data backups
```bash
node backend/scripts/cleanup-old-backups.js --dry-run
node backend/scripts/cleanup-old-backups.js
```

### 3. validate-schema-consistency.js
Detect schema drift between definitions and database
```bash
node backend/scripts/validate-schema-consistency.js
node backend/scripts/validate-schema-consistency.js --form-id=<UUID>
node backend/scripts/validate-schema-consistency.js --help
```

### 4. migration-health-check.js
Verify system integrity and health
```bash
node backend/scripts/migration-health-check.js
node backend/scripts/migration-health-check.js --help
```

### 5. generate-migration-report.js
Generate analytics and reports
```bash
node backend/scripts/generate-migration-report.js
node backend/scripts/generate-migration-report.js --days=7
node backend/scripts/generate-migration-report.js --days=90
```

## Quick Setup (Linux)

```bash
# 1. Create log directory
sudo mkdir -p /var/log/qcollector
sudo chown $USER:$USER /var/log/qcollector

# 2. Test scripts
node backend/scripts/migration-health-check.js
node backend/scripts/cleanup-old-backups.js --dry-run

# 3. Add to crontab
crontab -e

# 4. Add these lines (adjust PROJECT_DIR):
PROJECT_DIR=/path/to/qcollector
0 2 * * * cd $PROJECT_DIR && node backend/scripts/cleanup-old-backups.js >> /var/log/qcollector/backup-cleanup.log 2>&1
0 8 * * 1 cd $PROJECT_DIR && node backend/scripts/migration-health-check.js >> /var/log/qcollector/health-check.log 2>&1
0 17 * * 5 cd $PROJECT_DIR && node backend/scripts/generate-migration-report.js >> /var/log/qcollector/migration-report.log 2>&1
0 3 1 * * cd $PROJECT_DIR && node backend/scripts/validate-schema-consistency.js >> /var/log/qcollector/schema-validation.log 2>&1
```

## Output Files

- `reports/schema-drift-*.json` - Schema validation results
- `reports/migration-report-*.html` - Analytics report (human-readable)
- `reports/migration-stats-*.json` - Raw statistics (machine-readable)

## Exit Codes

- **0** = Success/Healthy
- **1** = Critical error
- **2** = Warnings (non-critical)

## Help

For detailed documentation, see:
- `SPRINT6-MAINTENANCE-SCRIPTS-COMPLETE.md` - Full documentation
- `cron-jobs.txt` - Platform-specific cron setup
- `--help` flag on any script

## Support

Run scripts with `--help` for usage information:
```bash
node backend/scripts/[script-name].js --help
```
