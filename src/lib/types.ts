/**
 * Type definitions for memory-membase plugin
 */

/**
 * Membase message structure (compatible with Membase Python SDK)
 */
export interface MembaseMessage {
	id: string;
	name: string;
	content: string;
	role: "system" | "user" | "assistant";
	url?: string | string[];
	metadata?: Record<string, any> | string;
	timestamp: string;
	type: "stm" | "ltm" | "profile";
}

/**
 * Encrypted data structure (AES-256-GCM)
 */
export interface EncryptedData {
	ciphertext: string; // Base64
	iv: string; // Base64
	authTag: string; // Base64
	salt: string; // Base64
}

/**
 * Memory file representation
 */
export interface MemoryFile {
	path: string; // Relative path from workspace
	content: string;
	timestamp: string;
	size: number;
}

/**
 * Backup options
 */
export interface BackupOptions {
	incremental?: boolean;
	force?: boolean;
}

/**
 * Backup result
 */
export interface BackupResult {
	backupId: string;
	fileCount: number;
	totalSize: number;
	timestamp: string;
	incremental?: boolean;
	skippedFiles?: number;
}

/**
 * Restore result
 */
export interface RestoreResult {
	fileCount: number;
	totalSize: number;
	timestamp: string;
	agentName: string;
}

/**
 * Backup info
 */
export interface BackupInfo {
	id: string;
	timestamp: string;
	fileCount: number;
	size?: number;
	incremental?: boolean;
}

/**
 * Plugin configuration
 */
export interface MembaseConfig {
	endpoint: string;
	agentName: string;
	workspaceDir?: string;
	autoBackup?: {
		enabled: boolean;
		onAgentEnd?: boolean;
		minInterval?: number; // Minimum backup interval in seconds
	};
}
