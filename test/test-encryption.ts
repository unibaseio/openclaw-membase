#!/usr/bin/env bun
/**
 * Test encryption module independently
 */

import { MemoryEncryption } from "../src/encryption.js";

console.log("🧪 Testing Encryption Module\n");

// Test 1: Basic encryption/decryption
console.log("Test 1: Basic encryption/decryption");
const plaintext = "This is a secret message from OpenClaw!";
const password = "Test1234!@#$";

try {
	const encrypted = MemoryEncryption.encrypt(plaintext, password);
	console.log("  ✓ Encryption successful");
	console.log(`    Ciphertext length: ${encrypted.ciphertext.length}`);
	console.log(`    IV length: ${encrypted.iv.length}`);
	console.log(`    Auth tag length: ${encrypted.authTag.length}`);
	console.log(`    Salt length: ${encrypted.salt.length}`);

	const decrypted = MemoryEncryption.decrypt(encrypted, password);
	console.log("  ✓ Decryption successful");

	if (decrypted === plaintext) {
		console.log("  ✓ Plaintext matches!");
	} else {
		console.log("  ✗ Plaintext mismatch!");
		process.exit(1);
	}
} catch (error) {
	console.error("  ✗ Test failed:", error);
	process.exit(1);
}

// Test 2: Wrong password should fail
console.log("\nTest 2: Wrong password should fail");
try {
	const encrypted = MemoryEncryption.encrypt(plaintext, password);
	const wrongPassword = "WrongPassword123!";
	MemoryEncryption.decrypt(encrypted, wrongPassword);
	console.log("  ✗ Should have thrown an error!");
	process.exit(1);
} catch (error) {
	console.log("  ✓ Correctly rejected wrong password");
}

// Test 3: Password validation
console.log("\nTest 3: Password validation");
try {
	MemoryEncryption.validatePassword("weak");
	console.log("  ✗ Should have rejected weak password!");
	process.exit(1);
} catch (error) {
	console.log("  ✓ Correctly rejected weak password");
}

try {
	MemoryEncryption.validatePassword("StrongPass123!@#");
	console.log("  ✓ Accepted strong password");
} catch (error) {
	console.log("  ✗ Should have accepted strong password!");
	process.exit(1);
}

// Test 4: Hash function
console.log("\nTest 4: Hash function");
const hash1 = MemoryEncryption.hash(plaintext);
const hash2 = MemoryEncryption.hash(plaintext);
const hash3 = MemoryEncryption.hash("Different text");

console.log(`  Hash 1: ${hash1.substring(0, 16)}...`);
if (hash1 === hash2) {
	console.log("  ✓ Same content produces same hash");
} else {
	console.log("  ✗ Hash should be deterministic!");
	process.exit(1);
}

if (hash1 !== hash3) {
	console.log("  ✓ Different content produces different hash");
} else {
	console.log("  ✗ Different content should have different hash!");
	process.exit(1);
}

// Test 5: Large data encryption
console.log("\nTest 5: Large data encryption");
const largeData = "A".repeat(100000); // 100 KB
try {
	const encrypted = MemoryEncryption.encrypt(largeData, password);
	const decrypted = MemoryEncryption.decrypt(encrypted, password);
	if (decrypted === largeData) {
		console.log("  ✓ Successfully encrypted/decrypted 100 KB");
	} else {
		console.log("  ✗ Large data corruption!");
		process.exit(1);
	}
} catch (error) {
	console.error("  ✗ Large data test failed:", error);
	process.exit(1);
}

// Test 6: Unicode and special characters
console.log("\nTest 6: Unicode and special characters");
const unicodeText = "Hello 世界! 🌍 Special chars: <>&\"'";
try {
	const encrypted = MemoryEncryption.encrypt(unicodeText, password);
	const decrypted = MemoryEncryption.decrypt(encrypted, password);
	if (decrypted === unicodeText) {
		console.log("  ✓ Unicode preserved correctly");
	} else {
		console.log("  ✗ Unicode corrupted!");
		process.exit(1);
	}
} catch (error) {
	console.error("  ✗ Unicode test failed:", error);
	process.exit(1);
}

console.log("\n✅ All encryption tests passed!\n");
