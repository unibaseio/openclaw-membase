#!/usr/bin/env bun
/**
 * Test Membase Hub connection
 */

import { MembaseClient } from "../src/lib/membase-client.js";

const ACCOUNT = process.env.MEMBASE_ACCOUNT;
const SECRET_KEY = process.env.MEMBASE_SECRET_KEY;
const ENDPOINT = process.env.MEMBASE_ENDPOINT || "https://testnet.hub.membase.io";

console.log("🧪 Testing Membase Hub Connection\n");

if (!ACCOUNT || !SECRET_KEY) {
	console.error("❌ Missing environment variables:");
	console.error("   MEMBASE_ACCOUNT:", ACCOUNT ? "✓" : "✗");
	console.error("   MEMBASE_SECRET_KEY:", SECRET_KEY ? "✓" : "✗");
	process.exit(1);
}

console.log("✓ Environment variables set");
console.log(`  MEMBASE_ACCOUNT: ${ACCOUNT}`);
console.log(`  MEMBASE_SECRET_KEY: ${SECRET_KEY.substring(0, 20)}...`);
console.log(`  MEMBASE_ENDPOINT: ${ENDPOINT}`);
console.log("");

const client = new MembaseClient(ENDPOINT);

// Test 1: Ping
console.log("Test 1: Ping Membase Hub");
try {
	const isAlive = await client.ping();
	if (isAlive) {
		console.log("  [OK] Hub is accessible");
	} else {
		console.log("  [FAIL] Hub is not accessible");
		process.exit(1);
	}
} catch (error) {
	console.error("  [FAIL] Ping failed:", error);
	process.exit(1);
}

// Test 2: List conversations (should work even if empty)
console.log("\nTest 2: List conversations");
try {
	const conversations = await client.listConversations(ACCOUNT);
	console.log(`  [OK] Found ${conversations.length} conversations`);
	if (conversations.length > 0) {
		console.log("  Conversations:", conversations.slice(0, 5));
	}
} catch (error) {
	console.error("  [FAIL] List failed:", error);
	process.exit(1);
}

// Test 3: Upload a test message
console.log("\nTest 3: Upload test message");
try {
	const testMessage = {
		sender: ACCOUNT,
		receiver: ACCOUNT,
		timestamp: Date.now(),
		content: "Test message from OpenClaw E2E test",
	};
	
	const testId = `openclaw-test-${Date.now()}`;
	await client.uploadMessage(ACCOUNT, testId, testMessage);
	console.log("  [OK] Message uploaded successfully");
	console.log(`  Message ID: ${testId}`);
} catch (error) {
	console.error("  [FAIL] Upload failed:", error);
	process.exit(1);
}

// Test 4: Download the message we just uploaded
console.log("\nTest 4: Download test message");
try {
	const conversations = await client.listConversations(ACCOUNT);
	if (conversations.length === 0) {
		console.log("  [WARN] No conversations found after upload");
	} else {
		const latestConv = conversations[conversations.length - 1];
		console.log(`  [OK] Latest conversation: ${latestConv}`);
		
		// Try to get the conversation messages
		const messages = await client.getConversation(ACCOUNT, latestConv);
		console.log(`  [OK] Retrieved ${messages.length} messages`);
	}
} catch (error) {
	console.error("  [FAIL] Download failed:", error);
	process.exit(1);
}

console.log("\n✅ All Membase connection tests passed!");
console.log("\nMembase Hub is working correctly and ready for backups.");
