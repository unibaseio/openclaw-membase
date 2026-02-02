# Installation

## From GitHub (Recommended)

### Option 1: Direct npm Install

```bash
npm install github:unibaseio/openclaw-plugin-membase
```

### Option 2: OpenClaw Plugin Configuration

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "slots": {
      "memory": "memory-membase"
    },
    "entries": {
      "memory-membase": {
        "enabled": true,
        "packageName": "github:unibaseio/openclaw-plugin-membase",
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

OpenClaw will automatically download and install the plugin.

### Option 3: Manual Installation

```bash
# Clone to extensions directory
cd ~/.openclaw/extensions
git clone https://github.com/unibaseio/openclaw-plugin-membase.git memory-membase
cd memory-membase

# Install dependencies
npm install

# Build
npm run build
```

## From npm (When Published)

```bash
npm install @unibase/openclaw-plugin-membase
```

## Environment Setup

Create environment file for Membase credentials:

```bash
cat > ~/.openclaw/.env-membase <<'EOF'
export MEMBASE_ACCOUNT=your-account-address
export MEMBASE_SECRET_KEY=your-secret-key
export MEMBASE_BACKUP_PASSWORD='YourStrongPassword123'
EOF
```

Load before use:

```bash
source ~/.openclaw/.env-membase
```

## Verify Installation

```bash
openclaw membase status
```

## Next Steps

See [Quick Start Guide](docs/QUICKSTART.md) for usage instructions.
