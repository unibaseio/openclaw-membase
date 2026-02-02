# Quick Start Guide

## Setup in 5 Minutes

### 1. Configure Environment Variables

Create environment file:

```bash
cat > ~/.openclaw/.env-membase <<'EOF'
# Membase credentials
export MEMBASE_ACCOUNT=your-account-address
export MEMBASE_SECRET_KEY=your-secret-key

# Auto-backup password (optional)
export MEMBASE_BACKUP_PASSWORD='YourStrongPassword123!@#'

# Disable proxy (if needed)
export no_proxy='*'
export https_proxy=''
export http_proxy=''
EOF
```

Load environment variables before use:
```bash
source ~/.openclaw/.env-membase
```

### 2. Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "slots": {
      "memory": "memory-membase"
    },
    "entries": {
      "memory-membase": {
        "enabled": true,
        "config": {
          "endpoint": "https://testnet.hub.membase.io",
          "agentName": "my-agent",
          "workspaceDir": "~/.openclaw/workspace",
          "autoBackup": {
            "enabled": true,
            "onAgentEnd": true,
            "minInterval": 3600
          }
        }
      }
    }
  }
}
```

### 3. Basic Commands

#### Check Status
```bash
openclaw membase status
```

#### Create Backup
```bash
# Full backup
openclaw membase backup --password 'YourPassword'

# Incremental backup (recommended)
openclaw membase backup --incremental --password 'YourPassword'
```

#### List Backups
```bash
openclaw membase list
```

#### Restore Backup
```bash
openclaw membase restore <backup-id> --password 'YourPassword'
```

#### Compare Backups
```bash
openclaw membase diff <backup-id-1> <backup-id-2> --password 'YourPassword'
```

#### Cleanup Old Backups
```bash
# Preview (dry-run)
openclaw membase cleanup --keep-last 10 --dry-run

# Execute cleanup (note: Membase doesn't support delete API yet)
openclaw membase cleanup --keep-last 10
```

## Complete Test Workflow

### Option 1: Using Test Script (Recommended)

```bash
# Create test script
cat > /tmp/test-membase.sh <<'EOF'
#!/bin/bash
set -e

# Load environment
source ~/.openclaw/.env-membase

echo "1. Check status"
openclaw membase status

echo ""
echo "2. List backups"
openclaw membase list

echo ""
echo "3. Create incremental backup"
openclaw membase backup -i --password "$MEMBASE_BACKUP_PASSWORD"

echo ""
echo "✅ Done!"
EOF

# Run test
chmod +x /tmp/test-membase.sh
/tmp/test-membase.sh
```

### Option 2: Manual Testing

```bash
# Load environment
source ~/.openclaw/.env-membase

# Test commands
openclaw membase status
openclaw membase list
openclaw membase backup -i --password "$MEMBASE_BACKUP_PASSWORD"

# Compare two backups
BACKUP1=$(openclaw membase list | grep backup | head -1 | awk '{print $1}')
BACKUP2=$(openclaw membase list | grep backup | head -2 | tail -1 | awk '{print $1}')
openclaw membase diff $BACKUP1 $BACKUP2 --password "$MEMBASE_BACKUP_PASSWORD"
```

## Test Auto-Backup

Auto-backup triggers after agent sessions. To test:

```bash
# Ensure auto-backup is configured
cat ~/.openclaw/openclaw.json | grep -A5 autoBackup

# Set environment variable
export MEMBASE_BACKUP_PASSWORD='YourPassword123!@#'

# Run a simple agent session
openclaw agent --message "hi" --thinking low

# Check logs for auto-backup records
# [plugins] memory-membase: starting auto-backup (incremental)...
# [plugins] memory-membase: auto-backup completed (X files, Y KB)
```

## Verify Backup Integrity

```bash
# Backup current files
cp ~/.openclaw/workspace/MEMORY.md /tmp/MEMORY.md.backup

# Modify file
echo "TEST" > ~/.openclaw/workspace/MEMORY.md

# Restore backup
openclaw membase restore <backup-id> --password 'YourPassword'

# Compare content
diff /tmp/MEMORY.md.backup ~/.openclaw/workspace/MEMORY.md
# Should be identical!

# Cleanup
rm /tmp/MEMORY.md.backup
```

## Common Use Cases

### Daily Backup Workflow

```bash
# Morning - start of work
openclaw membase backup --password 'xxx'

# Evening - backup changes
openclaw membase backup -i --password 'xxx'

# Review what changed today
MORNING_ID="..."
EVENING_ID="..."
openclaw membase diff $MORNING_ID $EVENING_ID --password 'xxx'
```

### Cross-Device Sync

```bash
# Device A
openclaw membase backup --password 'xxx'
# Note the backup-id: backup-2026-02-01T10-00-00-000Z

# Device B
openclaw membase restore backup-2026-02-01T10-00-00-000Z --password 'xxx'
```

### Regular Cleanup

```bash
# Weekly cleanup - keep last 30 backups
openclaw membase cleanup --keep-last 30 --dry-run  # Preview first
# Confirm and execute (note: Membase doesn't support delete API currently)
```

## Important Notes

1. **Password Security**
   - Use strong passwords (12+ characters, mixed case, numbers, special chars)
   - Don't save passwords in command history
   - Use environment variable `MEMBASE_BACKUP_PASSWORD`

2. **Network Configuration**
   - If using proxy, set `no_proxy='*'` or configure proxy correctly
   - Membase testnet endpoint: `https://testnet.hub.membase.io`

3. **Backup Frequency**
   - Incremental backups are fast, use them frequently
   - Auto-backup recommended interval: ≥ 3600 seconds (1 hour)

4. **Data Recovery**
   - Restore overwrites local files
   - Backup current state before restoring

## Troubleshooting

### Issue 1: Plugin Not Loaded

```bash
# Check configuration
cat ~/.openclaw/openclaw.json | grep memory-membase

# Check plugin directory
ls -la /path/to/openclaw/extensions/memory-membase/
```

### Issue 2: Network Connection Failed

```bash
# Test network
curl https://testnet.hub.membase.io

# Disable proxy
export https_proxy=''
export http_proxy=''
export no_proxy='*'
```

### Issue 3: Backup Failed

```bash
# Check environment variables
echo $MEMBASE_ACCOUNT
echo $MEMBASE_SECRET_KEY

# Check workspace files
ls -la ~/.openclaw/workspace/
```

## More Resources

- [Complete Documentation](../README.md)
- [Implementation Details](../README.md#security)
