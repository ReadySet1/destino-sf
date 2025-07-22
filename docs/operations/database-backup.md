# Database Backup & Recovery Operations

This document describes the comprehensive database backup and recovery system for Destino SF.

## Overview

The database backup system provides multiple layers of protection:

1. **Full Database Backups** - Complete PostgreSQL dumps using pg_dump
2. **Order-Specific Backups** - Targeted JSON backups for order cleanup operations
3. **Safe Workflow Integration** - Automated backup creation before major operations
4. **Multiple Recovery Options** - Full database restore or granular data recovery

## Scripts Overview

### Primary Scripts

| Script | Purpose | Format | Use Case |
|--------|---------|---------|----------|
| `safe-cleanup-workflow.ts` | ⭐ **Master workflow** | Multiple | Complete safety workflow |
| `backup-database.ts` | Full database backup | pg_dump | Regular backups, pre-operation safety |
| `restore-database.ts` | Database restoration | pg_restore/psql | Disaster recovery, environment setup |
| `clean-testing-orders.ts` | Order cleanup | JSON | Remove test data |
| `restore-orders-from-backup.ts` | Order restoration | JSON | Granular recovery |

## Quick Reference

### **🛡️ RECOMMENDED: Safe Cleanup Workflow**

Maximum safety with full database backup:

```bash
# Always start with preview
pnpm safe-cleanup:preview

# Execute safe cleanup (test emails only)
pnpm safe-cleanup:test-emails

# Full safe cleanup
pnpm safe-cleanup:execute
```

### **💾 Database Backup Operations**

```bash
# Standard backup (custom format, compressed)
pnpm backup-db

# SQL format for analysis
pnpm backup-db:sql

# Directory format for large databases
pnpm backup-db:dir

# Schema only (no data)
pnpm backup-db:schema
```

### **🔄 Database Restore Operations**

```bash
# Restore from backup
pnpm restore-db --backup-file="path/to/backup.dump"

# Restore to new database
pnpm restore-db --backup-file="backup.dump" --target-db="test_db" --create-db

# Preview restore (dry run)
pnpm restore-db --backup-file="backup.dump" --dry-run
```

## Backup Formats

### Custom Format (Recommended)

**Best for**: Regular backups, production use, fastest restore

```bash
pnpm backup-db --format=custom
```

**Features:**
- ✅ Compressed by default
- ✅ Fastest restore
- ✅ Selective restore capability
- ✅ Built-in integrity checking
- ❌ Not human-readable

### SQL Format

**Best for**: Analysis, version control, cross-database migration

```bash
pnpm backup-db --format=sql --compress
```

**Features:**
- ✅ Human-readable
- ✅ Version control friendly
- ✅ Universal compatibility
- ✅ Easy to modify
- ❌ Slower restore
- ❌ Larger file size (without compression)

### Directory Format

**Best for**: Very large databases, parallel processing

```bash
pnpm backup-db --format=directory --parallel-jobs=8
```

**Features:**
- ✅ Parallel dump/restore
- ✅ Best for huge databases
- ✅ Individual table files
- ✅ Selective restore
- ❌ More complex file structure
- ❌ Requires directory handling

## Backup Strategies

### Pre-Operation Safety

Before any major database operation:

```bash
# Create safety backup
pnpm backup-db

# Or use the safe workflow
pnpm safe-cleanup:preview
pnpm safe-cleanup:execute
```

### Regular Maintenance

For regular database maintenance:

```bash
# Weekly full backup
pnpm backup-db --format=custom --retention-days=30

# Monthly SQL backup for analysis
pnpm backup-db --format=sql --compress --retention-days=90
```

### Development & Testing

For development environments:

```bash
# Schema-only backup for new environments
pnpm backup-db --schema-only --format=sql

# Quick backup before testing
pnpm backup-db --format=custom --no-verify
```

## Recovery Scenarios

### Scenario 1: Accidental Order Deletion

**Problem**: Accidentally deleted some orders during cleanup

**Solution**: Use order-specific backup

```bash
# Find the order backup file
ls -la backups/order-cleanup/

# Restore specific orders
pnpm restore-orders --backup-file="backups/order-cleanup/orders-backup-2024-01-01.json" --execute
```

### Scenario 2: Database Corruption

**Problem**: Database corruption or major data loss

**Solution**: Full database restore

```bash
# Find latest database backup
ls -la backups/database/

# Restore to current database (DANGEROUS - drops existing data)
pnpm restore-db --backup-file="backups/database/mydb-2024-01-01.dump" --drop-existing

# Or restore to new database for safety
pnpm restore-db --backup-file="backups/database/mydb-2024-01-01.dump" --target-db="recovered_db" --create-db
```

### Scenario 3: Environment Migration

**Problem**: Need to set up new environment with production data

**Solution**: Schema + selective data restore

```bash
# First, create schema-only backup from production
pnpm backup-db --schema-only --format=sql

# Restore schema to new environment
pnpm restore-db --backup-file="schema-backup.sql" --target-db="staging_db" --create-db

# Then restore specific data as needed
# (Use order-specific backups or custom queries)
```

### Scenario 4: Point-in-Time Recovery

**Problem**: Need to restore database to specific point in time

**Solution**: Use timestamped backup closest to desired time

```bash
# List available backups with timestamps
ls -la backups/database/ | grep "2024-01-01"

# Restore from specific timestamp
pnpm restore-db --backup-file="backups/database/mydb-2024-01-01T10-30-00.dump" --drop-existing
```

## Backup Storage & Security

### File Organization

```
backups/
├── database/               # Full database backups
│   ├── mydb-2024-01-01T10-00-00.dump
│   ├── mydb-2024-01-01T10-00-00.metadata.json
│   └── mydb-2024-01-02T10-00-00.dump
└── order-cleanup/          # Order-specific backups
    ├── orders-backup-2024-01-01T15-30-00.json
    └── orders-backup-2024-01-02T09-15-00.json
```

### Metadata Files

Each database backup includes a metadata file with:

```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "databaseName": "destino_production",
  "format": "custom",
  "compressed": true,
  "size": 52428800,
  "duration": 15000,
  "postgresVersion": "15.3",
  "backupPath": "/path/to/backup.dump",
  "config": { ... }
}
```

### Security Considerations

1. **Access Control**: Restrict backup file access to authorized personnel
2. **Encryption**: Consider encrypting sensitive backups
3. **Storage Location**: Store backups on separate systems/locations
4. **Retention**: Implement automatic cleanup of old backups
5. **Verification**: Regularly test backup restoration process

## Automation & Monitoring

### Scheduled Backups

Add to cron or CI/CD pipeline:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/project && pnpm backup-db --format=custom --retention-days=30

# Weekly SQL backup for analysis
0 3 * * 0 cd /path/to/project && pnpm backup-db --format=sql --compress --retention-days=90
```

### Backup Verification

Regular verification of backup integrity:

```bash
# Test restore to temporary database
pnpm restore-db --backup-file="latest-backup.dump" --target-db="test_restore" --create-db

# Clean up test database
psql -c "DROP DATABASE IF EXISTS test_restore"
```

### Monitoring

Monitor backup operations:

1. **File Size Trends**: Track backup size over time
2. **Duration Monitoring**: Alert on unusually long backup times
3. **Success Rate**: Monitor backup success/failure rates
4. **Storage Usage**: Track backup storage consumption
5. **Recovery Testing**: Regular restore testing

## Troubleshooting

### Common Issues

**"pg_dump not found"**
- Install PostgreSQL client tools
- Ensure pg_dump is in PATH
- Check PostgreSQL version compatibility

**"Connection refused"**
- Verify DATABASE_URL/DIRECT_URL
- Check database server status
- Verify network connectivity
- Check firewall settings

**"Out of disk space"**
- Enable compression: `--compress`
- Use cleanup: `--retention-days=X`
- Check available disk space
- Consider directory format for large DBs

**"Backup verification failed"**
- Check backup file integrity
- Verify PostgreSQL version compatibility
- Test with smaller backup first
- Check backup format compatibility

### Performance Optimization

**Large Databases:**
```bash
# Use directory format with parallel processing
pnpm backup-db --format=directory --parallel-jobs=8

# Exclude large tables if not needed
pnpm backup-db --exclude-table=audit_logs --exclude-table=temp_data
```

**Network Issues:**
```bash
# Use DIRECT_URL for better performance
pnpm backup-db --use-direct-url

# Reduce compression for faster backup (larger files)
pnpm backup-db --format=custom --no-compress
```

### Recovery Procedures

**Emergency Recovery Checklist:**

1. **Assess Situation**
   - What data was lost?
   - When did the issue occur?
   - What backups are available?

2. **Stop Application**
   - Prevent further data changes
   - Notify users of maintenance

3. **Identify Recovery Strategy**
   - Full database restore?
   - Partial data recovery?
   - Point-in-time recovery?

4. **Execute Recovery**
   - Test restore on separate database first
   - Verify data integrity
   - Update application connections

5. **Verify & Resume**
   - Test application functionality
   - Verify data consistency
   - Resume normal operations
   - Document incident

## Best Practices

### 📅 Regular Operations

1. **Daily**: Automated database backups
2. **Weekly**: SQL format backups for analysis
3. **Monthly**: Backup verification testing
4. **Quarterly**: Full recovery procedure testing

### 🔒 Safety First

1. **Always test restore procedures**
2. **Keep multiple backup copies**
3. **Store backups in multiple locations**
4. **Document recovery procedures**
5. **Train team on recovery processes**

### ⚡ Performance

1. **Use compression for storage efficiency**
2. **Schedule backups during low-traffic periods**
3. **Use parallel processing for large databases**
4. **Monitor backup performance trends**

### 🚨 Emergency Preparedness

1. **Document emergency contacts**
2. **Maintain offline backup copies**
3. **Test restore procedures regularly**
4. **Have rollback plans ready**
5. **Practice disaster recovery scenarios**

---

## Summary

The database backup system provides comprehensive protection for your Destino SF data with multiple recovery options. Always use the **Safe Cleanup Workflow** for maximum protection, and regularly test your backup and recovery procedures.

For immediate help:
- 🛡️ Safe operations: Use `pnpm safe-cleanup:preview` first
- 💾 Quick backup: `pnpm backup-db`
- 🔄 Emergency restore: `pnpm restore-db --backup-file="path/to/backup"`
- 📖 Detailed docs: See [Order Cleanup Documentation](order-cleanup.md) 