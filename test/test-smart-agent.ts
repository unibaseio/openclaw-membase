#!/usr/bin/env bun
/**
 * 智能 Agent - 使用 Membase Skill 进行决策
 * 模拟一个真实的 AI agent 工作流
 */

import { spawn } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync } from "fs";

const sleep = promisify(setTimeout);

interface AgentMemory {
	lastBackupTime?: string;
	backupCount: number;
	decisions: string[];
}

class SmartAgent {
	private memory: AgentMemory;
	private workspace: string;
	private skillPath: string;

	constructor() {
		this.workspace = process.env.HOME + "/.openclaw/workspace";
		this.skillPath = "./skills/membase/membase.ts";
		this.memory = {
			backupCount: 0,
			decisions: [],
		};
	}

	private async executeSkill(
		command: string,
		args: string[] = [],
	): Promise<{ success: boolean; output: string; json?: any }> {
		return new Promise((resolve) => {
			const childProcess = spawn("bun", [this.skillPath, command, ...args], {
				cwd: process.cwd(),
				env: process.env,
			});

			let output = "";
			childProcess.stdout.on("data", (data) => (output += data.toString()));
			childProcess.stderr.on("data", (data) => (output += data.toString()));

			childProcess.on("close", (code) => {
				// 尝试提取 JSON 输出
				let json = undefined;
				const jsonMatch = output.match(/---JSON_OUTPUT---([\s\S]*?)---END_JSON---/);
				if (jsonMatch) {
					try {
						json = JSON.parse(jsonMatch[1].trim());
					} catch {}
				}

				resolve({ success: code === 0, output, json });
			});
		});
	}

	private log(emoji: string, message: string) {
		console.log(`${emoji} ${message}`);
	}

	private think(thought: string) {
		console.log(`💭 Agent 思考: ${thought}`);
		this.memory.decisions.push(thought);
	}

	private async analyzeStatus() {
		this.log("🔍", "分析当前状态...");
		const result = await this.executeSkill("status");

		if (result.json) {
			const status = result.json.status;
			this.log(
				"📊",
				`发现: 本地 ${status.local.fileCount} 个文件, 远程 ${status.remote.backupCount} 个备份`,
			);

			// 决策逻辑
			if (status.remote.backupCount === 0) {
				this.think("没有任何备份，需要立即创建初始备份");
				return "create_initial_backup";
			}

			if (status.local.fileCount > 0) {
				this.think("检测到本地文件，应该创建增量备份");
				return "create_incremental_backup";
			}

			this.think("当前状态良好，继续监控");
			return "monitor";
		}

		return "error";
	}

	private async createBackup(incremental = false) {
		this.log("💾", incremental ? "创建增量备份..." : "创建完整备份...");

		const args = [
			"--password",
			process.env.MEMBASE_BACKUP_PASSWORD || "",
			"--workspace",
			this.workspace,
		];

		if (incremental) {
			args.push("--incremental");
		}

		const result = await this.executeSkill("backup", args);

		if (result.success && result.json) {
			const backupInfo = result.json;
			this.memory.lastBackupTime = backupInfo.timestamp;
			this.memory.backupCount++;

			this.log(
				"✅",
				`备份成功: ${backupInfo.backupId} (${backupInfo.fileCount} 个文件, ${Math.round(backupInfo.totalSize / 1024)} KB)`,
			);

			if (backupInfo.skippedFiles > 0) {
				this.log("ℹ️", `跳过 ${backupInfo.skippedFiles} 个未更改的文件`);
			}

			return backupInfo.backupId;
		}

		this.log("❌", "备份失败");
		return null;
	}

	private async listBackups() {
		this.log("📋", "获取备份列表...");
		const result = await this.executeSkill("list");

		if (result.success && result.json) {
			const backups = result.json;
			this.log("📊", `共找到 ${backups.length} 个备份`);

			// 分析备份趋势
			const totalFiles = backups.reduce(
				(sum: number, b: any) => sum + b.fileCount,
				0,
			);
			const avgFilesPerBackup = (totalFiles / backups.length).toFixed(1);

			this.think(
				`备份统计: 平均每个备份 ${avgFilesPerBackup} 个文件`,
			);

			return backups;
		}

		return [];
	}

	async run() {
		console.log("🤖 Smart Agent 启动");
		console.log("=" .repeat(50));
		console.log("");

		// Phase 1: 状态分析
		this.log("🎯", "Phase 1: 状态分析");
		const action = await this.analyzeStatus();
		await sleep(1000);

		// Phase 2: 执行决策
		console.log("");
		this.log("🎯", "Phase 2: 执行决策");
		if (action === "create_initial_backup" || action === "create_incremental_backup") {
			const backupId = await this.createBackup(
				action === "create_incremental_backup",
			);

			if (backupId) {
				this.log("✨", `新备份已创建: ${backupId}`);
			}
		}
		await sleep(1000);

		// Phase 3: 验证和报告
		console.log("");
		this.log("🎯", "Phase 3: 验证和报告");
		const backups = await this.listBackups();

		console.log("");
		this.log("📝", "Agent 工作总结");
		console.log("-".repeat(50));
		console.log(`  决策次数: ${this.memory.decisions.length}`);
		console.log(`  创建备份: ${this.memory.backupCount} 个`);
		console.log(`  总备份数: ${backups.length} 个`);

		if (this.memory.decisions.length > 0) {
			console.log("\n  决策历史:");
			this.memory.decisions.forEach((d, i) => {
				console.log(`    ${i + 1}. ${d}`);
			});
		}

		console.log("");
		this.log("✅", "Smart Agent 任务完成！");
	}
}

// 运行智能 agent
const agent = new SmartAgent();
agent.run().catch((error) => {
	console.error("❌ Agent 错误:", error);
	process.exit(1);
});
