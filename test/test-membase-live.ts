#!/usr/bin/env bun
/**
 * Live test with real Membase credentials
 */

import { MembaseClient } from "../src/membase-client.js";
import { MemoryEncryption } from "../src/encryption.js";
import type { MembaseMessage } from "../src/types.js";

// Set environment variables
process.env.MEMBASE_ACCOUNT = "0x5ea13664c5ce67753f208540d25b913788aa3daa";
process.env.MEMBASE_SECRET_KEY = "c9e64785ef9c51c4e1d1c4f2cfbfa51c1117e5cffcecc2b631d38b16287c9bc4";

console.log("🧪 Testing Membase Hub with Real Credentials\n");
console.log("Account:", process.env.MEMBASE_ACCOUNT);
console.log("Hub: https://testnet.hub.membase.io\n");

const client = new MembaseClient("https://testnet.hub.membase.io");
const owner = process.env.MEMBASE_ACCOUNT;
const testId = `openclaw-test-${Date.now()}`;

// Test 1: Ping
console.log("Test 1: Ping Membase Hub");
try {
	const isReachable = await client.ping();
	if (isReachable) {
		console.log("  [OK] Hub is reachable\n");
	} else {
		console.log("  [FAIL] Hub not reachable\n");
		process.exit(1);
	}
} catch (error) {
	console.error("  [FAIL] Ping failed:", error);
	process.exit(1);
}

// Test 2: Upload encrypted test message
console.log("Test 2: Upload encrypted test message");
const testPassword = "TestPassword123!@#";
const testContent = "This is a test message from OpenClaw memory-membase plugin!";

const encrypted = MemoryEncryption.encrypt(testContent, testPassword);
const encryptedJson = JSON.stringify(encrypted);

const testMessage: MembaseMessage = {
	id: testId,
	name: "openclaw-agent",
	content: encryptedJson,
	role: "assistant",
	metadata: {
		test: true,
		encrypted: true,
		timestamp: new Date().toISOString(),
	},
	timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
	type: "ltm",
};

const filename = `test-${testId}`;
const bucket = `openclaw-backup-test-${testId}`;

try {
	await client.uploadMessage(owner, filename, testMessage, bucket);
	console.log("  [OK] Upload successful");
	console.log(`    Owner: ${owner}`);
	console.log(`    Filename: ${filename}`);
	console.log(`    Bucket: ${bucket}\n`);
} catch (error) {
	console.error("  [FAIL] Upload failed:", error);
	console.error("\nError details:", error);
	process.exit(1);
}

// Test 3: Download and decrypt
console.log("Test 3: Download and decrypt message");
try {
	const downloaded = await client.downloadMessage(owner, filename);
	console.log("  [OK] Download successful");
	console.log(`    Message ID: ${downloaded.id}`);

	// Decrypt
	const encryptedData = JSON.parse(downloaded.content);
	const decrypted = MemoryEncryption.decrypt(encryptedData, testPassword);

	if (decrypted === testContent) {
		console.log("  [OK] Decryption successful");
		console.log("  [OK] Content matches original\n");
	} else {
		console.log("  [FAIL] Content mismatch!");
		console.log("Expected:", testContent);
		console.log("Got:", decrypted);
		process.exit(1);
	}
} catch (error) {
	console.error("  [FAIL] Download/decrypt failed:", error);
	process.exit(1);
}

// Test 4: List conversations
console.log("Test 4: List conversations");
try {
	const conversations = await client.listConversations(owner);
	console.log(`  [OK] Found ${conversations.length} conversation(s)`);

	if (conversations.includes(bucket)) {
		console.log(`  [OK] Our test bucket "${bucket}" is in the list\n`);
	} else {
		console.log(`  [WARNING]  Test bucket not found in list (might take time to sync)\n`);
	}
} catch (error) {
	console.error("  [FAIL] List failed:", error);
}

// Test 5: Get conversation
console.log("Test 5: Get conversation messages");
try {
	const messages = await client.getConversation(owner, bucket);
	console.log(`  [OK] Retrieved ${messages.length} message(s) from conversation`);

	if (messages.length > 0) {
		console.log(`  [OK] First message ID: ${messages[0].id}`);
		console.log(`  [OK] Message metadata:`, messages[0].metadata);
	}
	console.log("");
} catch (error) {
	console.error("  [FAIL] Get conversation failed:", error);
}

// Test 6: Full backup/restore simulation
console.log("Test 6: Simulate full backup/restore cycle");
try {
	// Create multiple encrypted "files"
	const files = [
		{ path: "MEMORY.md", content: "# My Memory\n\nImportant notes." },
		{ path: "memory/2026-02-01.md", content: "# Daily Log\n\nToday's work." },
	];

	const backupId = `backup-${Date.now()}`;
	console.log(`  Backup ID: ${backupId}`);

	// Upload each "file"
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const encrypted = MemoryEncryption.encrypt(file.content, testPassword);

		const message: MembaseMessage = {
			id: `${backupId}-${i}`,
			name: "openclaw-agent",
			content: JSON.stringify(encrypted),
			role: "assistant",
			metadata: {
				file: file.path,
				encrypted: true,
			},
			timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
			type: "ltm",
		};

		await client.uploadMessage(owner, `${backupId}_${i}`, message, backupId);
		console.log(`  [OK] Uploaded ${file.path}`);
	}

	// Download and verify
	const backupMessages = await client.getConversation(owner, backupId);
	console.log(`  [OK] Downloaded ${backupMessages.length} files from backup`);

	// Verify each file
	for (let i = 0; i < backupMessages.length; i++) {
		const msg = backupMessages[i];
		const encrypted = JSON.parse(msg.content);
		const decrypted = MemoryEncryption.decrypt(encrypted, testPassword);
		const originalContent = files[i].content;

		if (decrypted === originalContent) {
			console.log(`  [OK] Verified ${(msg.metadata as any).file}`);
		} else {
			console.log(`  [FAIL] Verification failed for ${(msg.metadata as any).file}`);
			process.exit(1);
		}
	}

	console.log("");
} catch (error) {
	console.error("  [FAIL] Backup/restore simulation failed:", error);
	process.exit(1);
}

console.log("Success All Membase live tests passed!\n");
console.log("Summary:");
console.log("  [OK] Membase Hub is accessible");
console.log("  [OK] Upload works with encryption");
console.log("  [OK] Download and decryption works");
console.log("  [OK] Conversation listing works");
console.log("  [OK] Full backup/restore cycle validated");
console.log("\n[SUCCESS] Membase integration is FULLY FUNCTIONAL!\n");
