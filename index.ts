/**
 * Memory Membase Plugin
 * Encrypted memory backup and restore via Membase
 */

import type { OpenClawPlugin } from "openclaw/plugin-sdk";
import { membaseConfigSchema } from "./src/config.js";
import { MembaseClient } from "./src/membase-client.js";
import { BackupManager } from "./src/backup-manager.js";
import { registerMembaseCli } from "./src/cli.js";

const membasePlugin: OpenClawPlugin = {
	id: "memory-membase",
	name: "Memory Backup (Membase)",
	description: "Encrypted memory backup and restore via Membase decentralized storage",
	kind: "memory",
	configSchema: membaseConfigSchema,

	register(api) {
		// Parse plugin configuration
		const cfg = membaseConfigSchema.parse(api.pluginConfig);
		const workspaceDir = api.resolvePath(cfg.workspaceDir!);

		// Initialize Membase client
		const client = new MembaseClient(cfg.endpoint);

		// Initialize backup manager
		const manager = new BackupManager(client, workspaceDir, cfg.agentName);

		api.logger.info(`memory-membase: plugin registered (endpoint: ${cfg.endpoint}, workspace: ${workspaceDir})`);

		// Register CLI commands
		api.registerCli(registerMembaseCli(manager), {
			commands: ["membase"],
		});

		// Auto backup on agent_end (if enabled)
		if (cfg.autoBackup?.enabled && cfg.autoBackup?.onAgentEnd) {
			let lastBackupTime = 0;
			const minInterval = (cfg.autoBackup.minInterval || 3600) * 1000; // Convert to ms

			// Password cache (in-memory only, not persisted)
			// Note: This is a simple implementation. For production, consider:
			// 1. Using OS keychain
			// 2. Prompting user on first use
			// 3. Environment variable fallback
			let cachedPassword: string | null = null;

			api.on("agent_end", async (event: any) => {
				if (!event.success) {
					return; // Only backup on successful agent runs
				}

				// Check if enough time has passed since last backup
				const now = Date.now();
				if (now - lastBackupTime < minInterval) {
					api.logger.info(`memory-membase: skipping auto-backup (last backup was ${Math.round((now - lastBackupTime) / 1000)}s ago)`);
					return;
				}

				try {
					// Get password from environment or skip
					const password = process.env.MEMBASE_BACKUP_PASSWORD || cachedPassword;
					if (!password) {
						api.logger.warn("memory-membase: auto-backup skipped (no password set in MEMBASE_BACKUP_PASSWORD)");
						return;
					}

					cachedPassword = password; // Cache for future use

					api.logger.info("memory-membase: starting auto-backup (incremental)...");

					const result = await manager.backup(password, { incremental: true });

					lastBackupTime = now;

					if (result.fileCount > 0) {
						api.logger.info(`memory-membase: auto-backup completed (${result.fileCount} files, ${Math.round(result.totalSize / 1024)} KB)`);
					} else {
						api.logger.info("memory-membase: auto-backup completed (no changes)");
					}
				} catch (error) {
					api.logger.warn(`memory-membase: auto-backup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
				}
			});

			api.logger.info(`memory-membase: auto-backup enabled (interval: ${cfg.autoBackup.minInterval}s)`);
		}
	},
};

export default membasePlugin;
