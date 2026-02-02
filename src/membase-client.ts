/**
 * Membase HTTP client
 * Communicates with Membase Hub via REST API
 */

import type { MembaseMessage } from "./types.js";

interface UploadRequest {
	owner: string;
	bucket: string;
	id: string;
	message: string;
}

export class MembaseClient {
	constructor(private baseUrl: string) {}

	/**
	 * Upload a message to Membase Hub
	 */
	async uploadMessage(
		owner: string,
		filename: string,
		message: MembaseMessage,
		bucket?: string,
	): Promise<void> {
		const payload: UploadRequest = {
			owner,
			bucket: bucket || owner,
			id: filename,
			message: JSON.stringify(message),
		};

		const response = await fetch(`${this.baseUrl}/api/upload`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`Upload failed: ${response.status} ${errorText}`);
		}
	}

	/**
	 * Download a message from Membase Hub
	 */
	async downloadMessage(
		owner: string,
		filename: string,
	): Promise<MembaseMessage> {
		const params = new URLSearchParams({ owner, id: filename });

		const response = await fetch(`${this.baseUrl}/api/download`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Message not found: ${filename}`);
			}
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`Download failed: ${response.status} ${errorText}`);
		}

		const content = await response.text();
		return JSON.parse(content) as MembaseMessage;
	}

	/**
	 * List all conversation IDs for an owner
	 */
	async listConversations(owner: string): Promise<string[]> {
		const params = new URLSearchParams({ owner });

		const response = await fetch(`${this.baseUrl}/api/conversation`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`List conversations failed: ${response.status} ${errorText}`);
		}

		const result = await response.json();
		return Array.isArray(result) ? result : [];
	}

	/**
	 * Get all messages in a conversation
	 */
	async getConversation(
		owner: string,
		conversationId: string,
	): Promise<MembaseMessage[]> {
		const params = new URLSearchParams({ owner, id: conversationId });

		const response = await fetch(`${this.baseUrl}/api/conversation`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Conversation not found: ${conversationId}`);
			}
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`Get conversation failed: ${response.status} ${errorText}`);
		}

		const msgStrings = await response.json();
		if (!Array.isArray(msgStrings)) {
			return [];
		}

		return msgStrings.map((s: string) => {
			try {
				return JSON.parse(s) as MembaseMessage;
			} catch (error) {
				console.warn(`Failed to parse message: ${s}`);
				return null;
			}
		}).filter((msg): msg is MembaseMessage => msg !== null);
	}

	/**
	 * Check connection to Membase Hub
	 */
	async ping(): Promise<boolean> {
		try {
			const response = await fetch(this.baseUrl, { method: "HEAD" });
			return response.ok || response.status === 404; // 404 is ok, means server is up
		} catch (error) {
			return false;
		}
	}
}
