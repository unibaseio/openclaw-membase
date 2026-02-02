/**
 * CLI commands for memory-membase plugin
 */

import type { Command } from "commander";
import { password as inputPassword } from "@inquirer/prompts";
import type { BackupManager } from "./backup-manager.js";
import { MemoryEncryption } from "./encryption.js";

export function registerMembaseCli(manager: BackupManager) {
	return ({ program }: { program: Command }) => {
		const membase = program
			.command("membase")
			.description("Encrypted memory backup and restore via Membase");

		// openclaw membase backup
		membase
			.command("backup")
			.description("Backup local memories to Membase (encrypted)")
			.option("-p, --password <password>", "Encryption password")
			.option("--no-validate", "Skip password strength validation")
			.option("-i, --incremental", "Incremental backup (only changed files)")
			.action(async (opts) => {
				try {
					// Get password
					let password = opts.password;
					if (!password) {
						password = await inputPassword({
							message: "Enter encryption password:",
							mask: "*",
						});

						// Confirm password
						const confirmPassword = await inputPassword({
							message: "Confirm password:",
							mask: "*",
						});

						if (password !== confirmPassword) {
							console.error("✗ Passwords do not match");
							process.exit(1);
						}
					}

					// Validate password strength (unless disabled)
					if (opts.validate !== false) {
						try {
							MemoryEncryption.validatePassword(password);
						} catch (error) {
							console.error(`✗ ${error instanceof Error ? error.message : "Password validation failed"}`);
							console.error(
								"  Use --no-validate to skip password strength check",
							);
							process.exit(1);
						}
					}

					// Execute backup
					const result = await manager.backup(password, {
						incremental: opts.incremental,
					});

					console.log(`  Backup ID: ${result.backupId}`);
					console.log(`  Files: ${result.fileCount}`);
					if (result.incremental && result.skippedFiles) {
						console.log(`  Skipped: ${result.skippedFiles} unchanged files`);
					}
					console.log(`  Size: ${Math.round(result.totalSize / 1024)} KB`);
					console.log(`  Timestamp: ${result.timestamp}`);
					if (result.incremental) {
						console.log("  Type: Incremental");
					}
					console.log(
						"\n⚠️  Save your backup ID and password securely!",
					);
				} catch (error) {
					console.error(
						`✗ Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});

		// openclaw membase restore
		membase
			.command("restore <backup-id>")
			.description("Restore memories from Membase backup")
			.option("-p, --password <password>", "Decryption password")
			.action(async (backupId, opts) => {
				try {
					// Get password
					let password = opts.password;
					if (!password) {
						password = await inputPassword({
							message: "Enter decryption password:",
							mask: "*",
						});
					}

					// Execute restore
					const result = await manager.restore(backupId, password);

					console.log(`  Files restored: ${result.fileCount}`);
					console.log(
						`  Total size: ${Math.round(result.totalSize / 1024)} KB`,
					);
					console.log(`  Agent: ${result.agentName}`);
					console.log(`  Backup date: ${result.timestamp}`);
					console.log(`  Location: ~/.openclaw/workspace/`);
				} catch (error) {
					console.error(
						`✗ Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});

		// openclaw membase list
		membase
			.command("list")
			.description("List available backups")
			.action(async () => {
				try {
					const backups = await manager.listBackups();

					if (backups.length === 0) {
						console.log("No backups found.");
						return;
					}

					console.log("\nAvailable backups:\n");
					console.log(
						"ID                            Timestamp              Files  Size",
					);
					console.log("─".repeat(70));

					for (const backup of backups) {
						const date = backup.timestamp;
						const size = backup.size
							? `${Math.round(backup.size / 1024)} KB`
							: "N/A";
						const files = String(backup.fileCount).padEnd(7);

						console.log(
							`${backup.id.padEnd(30)} ${date.padEnd(22)} ${files} ${size}`,
						);
					}
				} catch (error) {
					console.error(
						`✗ List failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});

		// openclaw membase status
		membase
			.command("status")
			.description("Show backup status")
			.action(async () => {
				try {
					const status = await manager.getStatus();

					console.log("\nLocal:");
					console.log(`  Files: ${status.local.fileCount}`);
					console.log(
						`  Size: ${Math.round(status.local.totalSize / 1024)} KB`,
					);

					console.log("\nRemote:");
					console.log(`  Backups: ${status.remote.backupCount}`);
				} catch (error) {
					console.error(
						`✗ Status failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});

		// openclaw membase cleanup
		membase
			.command("cleanup")
			.description("Clean up old backups")
			.option("--keep-last <n>", "Keep last N backups", "10")
			.option("--dry-run", "Show what would be deleted without deleting")
			.action(async (opts) => {
				try {
					const keepLast = parseInt(opts.keepLast);
					const backups = await manager.listBackups();

					if (backups.length <= keepLast) {
						console.log(`\nOnly ${backups.length} backups exist (keeping ${keepLast})`);
						console.log("Nothing to clean up.");
						return;
					}

					const toDelete = backups.slice(keepLast);
					console.log(`\nFound ${backups.length} backups, will ${opts.dryRun ? "delete" : "keep ${keepLast}"}`);
					console.log(`\nBackups to delete (${toDelete.length}):\n`);

					for (const backup of toDelete) {
						console.log(`  - ${backup.id} (${backup.timestamp})`);
					}

					if (opts.dryRun) {
						console.log("\n(Dry run - no backups deleted)");
						return;
					}

					console.log("\n⚠️  Note: Membase doesn't currently support delete API.");
					console.log("   Please manually clean up via Membase Hub UI.");
				} catch (error) {
					console.error(
						`✗ Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});

		// openclaw membase diff
		membase
			.command("diff <backup-id-1> <backup-id-2>")
			.description("Compare two backups")
			.option("-p, --password <password>", "Decryption password")
			.action(async (backupId1, backupId2, opts) => {
				try {
					// Get password
					let password = opts.password;
					if (!password) {
						password = await inputPassword({
							message: "Enter decryption password:",
							mask: "*",
						});
					}

					const diff = await manager.diffBackups(backupId1, backupId2, password);

					console.log(`\nComparing backups:\n`);
					console.log(`  ${backupId1}`);
					console.log(`  ${backupId2}\n`);

					if (diff.added.length > 0) {
						console.log(`Added files (${diff.added.length}):`);
						for (const file of diff.added) {
							console.log(`  + ${file}`);
						}
					}

					if (diff.removed.length > 0) {
						console.log(`\nRemoved files (${diff.removed.length}):`);
						for (const file of diff.removed) {
							console.log(`  - ${file}`);
						}
					}

					if (diff.modified.length > 0) {
						console.log(`\nModified files (${diff.modified.length}):`);
						for (const file of diff.modified) {
							console.log(`  ~ ${file}`);
						}
					}

					if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
						console.log("No differences found.");
					}
				} catch (error) {
					console.error(
						`✗ Diff failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					process.exit(1);
				}
			});
	};
}
