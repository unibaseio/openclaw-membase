/**
 * Encryption module for memory backup
 * Uses AES-256-GCM for authenticated encryption
 */

import {
	pbkdf2Sync,
	randomBytes,
	createCipheriv,
	createDecipheriv,
	createHash,
} from "node:crypto";
import type { EncryptedData } from "./types.js";

export class MemoryEncryption {
	private static readonly ALGORITHM = "aes-256-gcm";
	private static readonly KEY_LENGTH = 32;
	private static readonly IV_LENGTH = 16;
	private static readonly SALT_LENGTH = 32;
	private static readonly PBKDF2_ITERATIONS = 100000;

	/**
	 * Encrypt plaintext using password
	 */
	static encrypt(plaintext: string, password: string): EncryptedData {
		// Generate random salt and IV
		const salt = randomBytes(this.SALT_LENGTH);
		const iv = randomBytes(this.IV_LENGTH);

		// Derive key from password using PBKDF2
		const key = this.deriveKey(password, salt);

		// Encrypt
		const cipher = createCipheriv(this.ALGORITHM, key, iv);
		const ciphertext = Buffer.concat([
			cipher.update(plaintext, "utf-8"),
			cipher.final(),
		]);

		// Get authentication tag
		const authTag = cipher.getAuthTag();

		return {
			ciphertext: ciphertext.toString("base64"),
			iv: iv.toString("base64"),
			authTag: authTag.toString("base64"),
			salt: salt.toString("base64"),
		};
	}

	/**
	 * Decrypt ciphertext using password
	 */
	static decrypt(encrypted: EncryptedData, password: string): string {
		// Decode Base64
		const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
		const iv = Buffer.from(encrypted.iv, "base64");
		const authTag = Buffer.from(encrypted.authTag, "base64");
		const salt = Buffer.from(encrypted.salt, "base64");

		// Derive key from password
		const key = this.deriveKey(password, salt);

		// Decrypt
		const decipher = createDecipheriv(this.ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		try {
			const plaintext = Buffer.concat([
				decipher.update(ciphertext),
				decipher.final(),
			]);

			return plaintext.toString("utf-8");
		} catch (error) {
			throw new Error("Decryption failed. Invalid password or corrupted data.");
		}
	}

	/**
	 * Derive encryption key from password using PBKDF2
	 */
	private static deriveKey(password: string, salt: Buffer): Buffer {
		return pbkdf2Sync(
			password,
			salt,
			this.PBKDF2_ITERATIONS,
			this.KEY_LENGTH,
			"sha256",
		);
	}

	/**
	 * Calculate SHA-256 hash of content (for verification)
	 */
	static hash(content: string): string {
		return createHash("sha256").update(content, "utf-8").digest("hex");
	}

	/**
	 * Validate password strength
	 */
	static validatePassword(password: string): void {
		if (password.length < 12) {
			throw new Error("Password must be at least 12 characters long");
		}

		const hasUpper = /[A-Z]/.test(password);
		const hasLower = /[a-z]/.test(password);
		const hasNumber = /[0-9]/.test(password);
		const hasSpecial = /[^A-Za-z0-9]/.test(password);

		if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
			throw new Error(
				"Password must include uppercase, lowercase, number, and special character",
			);
		}
	}
}
