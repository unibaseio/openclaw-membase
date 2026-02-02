# @unibase/openclaw-plugin-membase

Encrypted memory backup and restore for AI agents using Membase decentralized storage.

## Features

- End-to-end encryption (AES-256-GCM)
- Decentralized Membase storage
- Incremental backup support
- Auto-backup on agent completion

---

## 1. AgentSkills

AI agents auto-discover and use this skill by reading [skills/membase/SKILL.md](skills/membase/SKILL.md).

**Setup:**
```bash
export MEMBASE_ACCOUNT=your-account-address
export MEMBASE_SECRET_KEY=your-secret-key
export MEMBASE_BACKUP_PASSWORD=your-backup-password
```

**Commands:**
```bash
cd skills/membase
node membase.ts backup [--incremental]
node membase.ts restore <backup-id>
node membase.ts list
node membase.ts diff <backup-id-1> <backup-id-2>
node membase.ts status
node membase.ts cleanup [--keep-last <n>]
```

See [SKILL.md](skills/membase/SKILL.md) for complete instructions.

---

## 2. OpenClaw Extension

Integrates with OpenClaw to provide CLI commands and auto-backup hooks.

**Install:**
```bash
npm install github:unibaseio/openclaw-plugin-membase
```

**Configure** `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "slots": { "memory": "memory-membase" },
    "entries": {
      "memory-membase": {
        "enabled": true,
        "config": {
          "endpoint": "https://testnet.hub.membase.io",
          "agentName": "my-agent",
          "autoBackup": { "enabled": true, "minInterval": 3600 }
        }
      }
    }
  }
}
```

Set environment variables (same as above).

**Commands:**
```bash
openclaw membase backup [--incremental]
openclaw membase restore <backup-id>
openclaw membase list
openclaw membase status
```

Auto-backup triggers after agent sessions when enabled.

---

## Security

- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Client-side only, zero-knowledge

## Links

- [Membase](https://github.com/unibaseio/membase)
- [OpenClaw](https://github.com/openclaw/openclaw)
- [AgentSkills](https://agentskills.io)

## License

MIT
