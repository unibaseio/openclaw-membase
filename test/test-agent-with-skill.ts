#!/usr/bin/env bun
/**
 * 独立 Agent 测试 - 使用 Membase Skill
 * 这个 agent 完全独立运行，不依赖 OpenClaw
 */

import { spawn } from "child_process";
import { promisify } from "util";

const sleep = promisify(setTimeout);

// Agent 配置
const AGENT_CONFIG = {
	name: "TestAgent",
	workspace: process.env.HOME + "/.openclaw/workspace",
	skillPath: "./skills/membase/membase.ts",
};

console.log("🤖 独立 Agent 启动");
console.log("==================");
console.log(`Agent: ${AGENT_CONFIG.name}`);
console.log(`Workspace: ${AGENT_CONFIG.workspace}`);
console.log(`Skill: ${AGENT_CONFIG.skillPath}`);
console.log("");

// 检查环境变量
const requiredEnvVars = [
	"MEMBASE_ACCOUNT",
	"MEMBASE_SECRET_KEY",
	"MEMBASE_BACKUP_PASSWORD",
];

console.log("✓ 检查环境变量");
for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		console.error(`  ❌ ${envVar} 未设置`);
		process.exit(1);
	}
	const value = process.env[envVar] || "";
	const preview =
		envVar.includes("SECRET") || envVar.includes("PASSWORD")
			? value.substring(0, 10) + "..."
			: value;
	console.log(`  ✓ ${envVar}: ${preview}`);
}
console.log("");

// Agent Task: 执行 Membase skill 命令
async function executeSkill(
	command: string,
	args: string[] = [],
): Promise<{ success: boolean; output: string }> {
	return new Promise((resolve) => {
		const skillProcess = spawn("bun", [AGENT_CONFIG.skillPath, command, ...args], {
			cwd: process.cwd(),
			env: process.env,
		});

		let output = "";
		let errorOutput = "";

		skillProcess.stdout.on("data", (data) => {
			output += data.toString();
		});

		skillProcess.stderr.on("data", (data) => {
			errorOutput += data.toString();
		});

		skillProcess.on("close", (code) => {
			resolve({
				success: code === 0,
				output: output + errorOutput,
			});
		});
	});
}

// Agent 主循环
async function runAgent() {
	console.log("🎯 Agent 任务序列");
	console.log("=================");
	console.log("");

	// 任务 1: 检查备份状态
	console.log("📋 任务 1: 检查备份状态");
	console.log("----------------------");
	const statusResult = await executeSkill("status");
	console.log(statusResult.output);
	if (!statusResult.success) {
		console.error("❌ 任务失败");
		return;
	}
	await sleep(1000);

	// 任务 2: 创建备份
	console.log("\n📋 任务 2: 创建备份");
	console.log("------------------");
	console.log("Agent 决定: 需要创建新的备份来保存当前状态");
	const backupResult = await executeSkill("backup", [
		"--password",
		process.env.MEMBASE_BACKUP_PASSWORD || "",
		"--workspace",
		AGENT_CONFIG.workspace,
	]);
	console.log(backupResult.output);
	if (!backupResult.success) {
		console.error("❌ 备份失败");
		return;
	}
	await sleep(1000);

	// 任务 3: 列出所有备份
	console.log("\n📋 任务 3: 列出所有备份");
	console.log("----------------------");
	console.log("Agent 决定: 查看所有可用的备份");
	const listResult = await executeSkill("list");
	console.log(listResult.output);
	if (!listResult.success) {
		console.error("❌ 列表失败");
		return;
	}
	await sleep(1000);

	// 任务 4: 再次检查状态（验证备份已创建）
	console.log("\n📋 任务 4: 验证备份已创建");
	console.log("------------------------");
	const finalStatusResult = await executeSkill("status");
	console.log(finalStatusResult.output);

	console.log("\n✅ Agent 任务完成");
	console.log("=================");
	console.log("");
	console.log("Agent 总结:");
	console.log("  ✓ 检查了初始状态");
	console.log("  ✓ 创建了新的加密备份");
	console.log("  ✓ 列出了所有可用备份");
	console.log("  ✓ 验证了备份状态");
	console.log("");
	console.log(`🤖 ${AGENT_CONFIG.name} 成功完成所有任务！`);
}

// 运行 Agent
runAgent().catch((error) => {
	console.error("❌ Agent 错误:", error);
	process.exit(1);
});
