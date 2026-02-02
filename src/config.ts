/**
 * Configuration schema for memory-membase plugin
 */

import type { MembaseConfig } from "./types.js";

export const membaseConfigSchema = {
	parse(value: unknown): MembaseConfig {
		if (typeof value !== "object" || value === null) {
			throw new Error("Membase config must be an object");
		}

		const cfg = value as Record<string, any>;

		// Default endpoint: Membase testnet
		const endpoint =
			cfg.endpoint || "https://testnet.hub.membase.io";

		// Agent name defaults to "default"
		const agentName = cfg.agentName || "default";

		// Workspace directory defaults to ~/.openclaw/workspace
		const workspaceDir = cfg.workspaceDir || "~/.openclaw/workspace";

		// Auto backup configuration
		const autoBackup = cfg.autoBackup || {
			enabled: false,
			onAgentEnd: false,
			minInterval: 3600, // 1 hour default
		};

		return {
			endpoint,
			agentName,
			workspaceDir,
			autoBackup,
		};
	},

	uiHints: {
		endpoint: {
			label: "Membase Hub Endpoint",
			placeholder: "https://testnet.hub.membase.io",
			description: "Membase Hub server URL (default: testnet)",
		},
		agentName: {
			label: "Agent Name",
			placeholder: "my-agent",
			description: "Unique identifier for your backups",
		},
	},
};
