# @unibase/openclaw-plugin-membase

Encrypted memory backup and restore plugin for OpenClaw using Membase decentralized storage.

## Features

- 🔐 End-to-end encryption (AES-256-GCM)
- 🌐 Decentralized storage via Membase
- 📦 Incremental backup support
- 🤖 Auto-backup on agent completion
- 🔄 Backup version management (diff, cleanup)

## Installation

```bash
npm install @unibase/openclaw-plugin-membase
```

## Quick Start

See [Quick Start Guide](./docs/QUICKSTART.md) for detailed usage instructions.

### Basic Configuration

Add to `~/.openclaw/openclaw.json`:

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

### Environment Variables

```bash
export MEMBASE_ACCOUNT=your-account-address
export MEMBASE_SECRET_KEY=your-secret-key
export MEMBASE_BACKUP_PASSWORD=your-backup-password
```

### Basic Commands

```bash
# Create backup
openclaw membase backup --password 'YourPassword'

# List backups
openclaw membase list

# Restore backup
openclaw membase restore <backup-id> --password 'YourPassword'

# Check status
openclaw membase status
```

## Documentation

- [Installation Guide](./INSTALLATION.md)
- [Quick Start Guide](./docs/QUICKSTART.md)

## Security

- AES-256-GCM authenticated encryption
- PBKDF2 key derivation (100,000 iterations)
- Client-side encryption only
- Zero-knowledge architecture

## License

MIT

## Links

- [Membase](https://github.com/unibaseio/membase)
- [OpenClaw](https://github.com/openclaw/openclaw)
