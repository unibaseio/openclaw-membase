/**
 * Backup manager for encrypted memory backup and restore
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import fg from "fast-glob";
import { MembaseClient } from "./membase-client.js";
import { MemoryEncryption } from "./encryption.js";
import type {
	BackupResult,
	RestoreResult,
	BackupInfo,
	MemoryFile,
	MembaseMessage,
	BackupOptions,
} from "./types.js";

export class BackupManager {
	private readonly owner: string;

	constructor(
		private client: MembaseClient,
		private workspaceDir: string,
		private agentName: string,
	) {
		this.owner = `openclaw-backup-${agentName}`;
	}

	/**
	 * Backup: scan files → encrypt → upload to Membase
	 */
	async backup(password: string, options: BackupOptions = {}): Promise<BackupResult> {
		// 1. Scan and read files
		console.log("Scanning local memories...");
		const allFiles = await this.scanAndReadFiles();

		if (allFiles.length === 0) {
			throw new Error("No memory files found to backup");
		}

		console.log(`  Found ${allFiles.length} files`);

		// 2. Filter files for incremental backup
		let filesToBackup = allFiles;
		let skippedFiles = 0;

		if (options.incremental) {
			const lastBackup = await this.getLatestBackup();
			if (lastBackup) {
				console.log(`  Incremental backup since ${lastBackup.timestamp}`);
				const lastBackupTime = this.parseBackupTimestamp(lastBackup.timestamp);

				filesToBackup = allFiles.filter(file => {
					const fileTime = new Date(file.timestamp);
					return fileTime > lastBackupTime;
				});

				skippedFiles = allFiles.length - filesToBackup.length;

				if (filesToBackup.length === 0) {
					console.log("  No files changed since last backup");
					return {
						backupId: lastBackup.id,
						fileCount: 0,
						totalSize: 0,
						timestamp: new Date().toISOString(),
						incremental: true,
						skippedFiles,
					};
				}

				console.log(`  ${filesToBackup.length} changed, ${skippedFiles} unchanged`);
			} else {
				console.log("  No previous backup found, doing full backup");
			}
		}

		// 3. Generate backup ID with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupId = `backup-${timestamp}`;

		let totalSize = 0;

		// 4. Encrypt and upload each file
		for (let i = 0; i < filesToBackup.length; i++) {
			const file = filesToBackup[i];
			console.log(`  Encrypting ${file.path}...`);

			// Encrypt file content
			const encrypted = MemoryEncryption.encrypt(file.content, password);

			// Build Membase message
			const message: MembaseMessage = {
				id: `${backupId}-${i}`,
				name: "openclaw-agent",
				content: JSON.stringify(encrypted),
				role: "assistant",
				metadata: {
					file: file.path,
					timestamp: file.timestamp,
					size: file.size,
					encrypted: true,
					incremental: options.incremental,
				},
				timestamp: new Date()
					.toISOString()
					.replace("T", " ")
					.split(".")[0],
				type: "ltm",
			};

			// Upload to Membase (as a message in the backup conversation)
			const filename = `${backupId}_${i}`;
			await this.client.uploadMessage(
				this.owner,
				filename,
				message,
				backupId,
			);

			totalSize += file.size;
		}

		console.log("\n[OK] Backup completed");

		return {
			backupId,
			fileCount: filesToBackup.length,
			totalSize,
			timestamp: new Date().toISOString(),
			incremental: options.incremental,
			skippedFiles,
		};
	}

	/**
	 * Restore: download from Membase → decrypt → write files
	 */
	async restore(backupId: string, password: string): Promise<RestoreResult> {
		console.log(`Downloading backup: ${backupId}`);

		// 1. Get conversation (all backup messages)
		const messages = await this.client.getConversation(this.owner, backupId);

		if (!messages || messages.length === 0) {
			throw new Error(`Backup not found: ${backupId}`);
		}

		console.log(`Found ${messages.length} files in backup`);
		console.log("Decrypting and restoring...");

		let totalSize = 0;

		// 2. Decrypt and write each file
		for (const msg of messages) {
			const metadata = msg.metadata as Record<string, any>;
			const filePath = metadata.file;

			try {
				// Decrypt content
				const encrypted = JSON.parse(msg.content);
				const content = MemoryEncryption.decrypt(encrypted, password);

				// Write file
				const absPath = join(this.workspaceDir, filePath);
				const dir = join(absPath, "..");
				await mkdir(dir, { recursive: true });
				await writeFile(absPath, content, "utf-8");

				const sizeKb = Math.round(metadata.size / 1024);
				console.log(`  [OK] ${filePath} (${sizeKb} KB)`);
				totalSize += metadata.size;
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("Decryption failed")
				) {
					throw new Error("Decryption failed. Invalid password.");
				}
				throw error;
			}
		}

		console.log("\n[OK] Restore completed");

		return {
			fileCount: messages.length,
			totalSize,
			timestamp: messages[0]?.timestamp || new Date().toISOString(),
			agentName: this.agentName,
		};
	}

	/**
	 * List all available backups
	 */
	async listBackups(): Promise<BackupInfo[]> {
		const conversations = await this.client.listConversations(this.owner);

		if (!conversations || conversations.length === 0) {
			return [];
		}

		const backups: BackupInfo[] = [];

		for (const convId of conversations) {
			if (convId.startsWith("backup-")) {
				try {
					const messages = await this.client.getConversation(
						this.owner,
						convId,
					);

					// Calculate total size from metadata
					let totalSize = 0;
					for (const msg of messages) {
						const metadata = msg.metadata as Record<string, any>;
						if (metadata?.size) {
							totalSize += metadata.size;
						}
					}

					backups.push({
						id: convId,
						timestamp: convId.replace("backup-", "").replace(/-/g, ":"),
						fileCount: messages.length,
						size: totalSize,
					});
				} catch (error) {
					console.warn(`Failed to get backup info for ${convId}:`, error);
				}
			}
		}

		// Sort by timestamp (newest first)
		return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
	}

	/**
	 * Get backup status/info
	 */
	async getStatus(): Promise<{
		local: { fileCount: number; totalSize: number };
		remote: { backupCount: number };
	}> {
		// Local stats
		const localFiles = await this.scanAndReadFiles();
		const localSize = localFiles.reduce((sum, f) => sum + f.size, 0);

		// Remote stats
		const backups = await this.listBackups();

		return {
			local: {
				fileCount: localFiles.length,
				totalSize: localSize,
			},
			remote: {
				backupCount: backups.length,
			},
		};
	}

	/**
	 * Get the latest backup
	 */
	async getLatestBackup(): Promise<BackupInfo | null> {
		const backups = await this.listBackups();
		return backups.length > 0 ? backups[0] : null;
	}

	/**
	 * Parse backup timestamp from backup ID
	 */
	private parseBackupTimestamp(timestampStr: string): Date {
		// Format: "2026:02:01T09:02:38:381Z" -> "2026-02-01T09:02:38.381Z"
		const cleaned = timestampStr
			.replace(/^(\d{4}):(\d{2}):(\d{2})T(\d{2}):(\d{2}):(\d{2}):(\d{3})Z$/, "$1-$2-$3T$4:$5:$6.$7Z");
		return new Date(cleaned);
	}

	/**
	 * Delete a backup
	 */
	async deleteBackup(backupId: string): Promise<void> {
		// Note: Membase doesn't have direct delete API
		// This would need to be implemented when Membase supports it
		throw new Error("Delete backup not yet implemented (Membase limitation)");
	}

	/**
	 * Compare two backups and return differences
	 */
	async diffBackups(backupId1: string, backupId2: string, password: string): Promise<{
		added: string[];
		removed: string[];
		modified: string[];
	}> {
		// Get both backups
		const [messages1, messages2] = await Promise.all([
			this.client.getConversation(this.owner, backupId1),
			this.client.getConversation(this.owner, backupId2),
		]);

		if (!messages1 || messages1.length === 0) {
			throw new Error(`Backup not found: ${backupId1}`);
		}
		if (!messages2 || messages2.length === 0) {
			throw new Error(`Backup not found: ${backupId2}`);
		}

		// Build file maps: filename -> content hash
		const files1 = new Map<string, string>();
		const files2 = new Map<string, string>();

		for (const msg of messages1) {
			const metadata = msg.metadata as Record<string, any>;
			const filePath = metadata.file;
			try {
				const encrypted = JSON.parse(msg.content);
				const content = MemoryEncryption.decrypt(encrypted, password);
				files1.set(filePath, this.hashContent(content));
			} catch (error) {
				// Skip files that can't be decrypted
			}
		}

		for (const msg of messages2) {
			const metadata = msg.metadata as Record<string, any>;
			const filePath = metadata.file;
			try {
				const encrypted = JSON.parse(msg.content);
				const content = MemoryEncryption.decrypt(encrypted, password);
				files2.set(filePath, this.hashContent(content));
			} catch (error) {
				// Skip files that can't be decrypted
			}
		}

		// Find differences
		const added: string[] = [];
		const removed: string[] = [];
		const modified: string[] = [];

		// Files in backup2 but not in backup1 = added
		for (const [path, hash2] of files2.entries()) {
			if (!files1.has(path)) {
				added.push(path);
			} else if (files1.get(path) !== hash2) {
				modified.push(path);
			}
		}

		// Files in backup1 but not in backup2 = removed
		for (const path of files1.keys()) {
			if (!files2.has(path)) {
				removed.push(path);
			}
		}

		return {
			added: added.sort(),
			removed: removed.sort(),
			modified: modified.sort(),
		};
	}

	/**
	 * Simple content hash for comparison
	 */
	private hashContent(content: string): string {
		// Simple hash (could use crypto.createHash for better hashing)
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString(36);
	}

	/**
	 * Scan and read memory files from workspace
	 */
	private async scanAndReadFiles(): Promise<MemoryFile[]> {
		const filePaths = await fg(["MEMORY.md", "memory/**/*.md"], {
			cwd: this.workspaceDir,
			absolute: true,
			ignore: ["**/node_modules/**"],
		});

		const files: MemoryFile[] = [];

		for (const absPath of filePaths) {
			const content = await readFile(absPath, "utf-8");
			const fileStat = await stat(absPath);
			const relativePath = relative(this.workspaceDir, absPath);

			files.push({
				path: relativePath,
				content,
				timestamp: fileStat.mtime.toISOString(),
				size: fileStat.size,
			});
		}

		return files;
	}
}
