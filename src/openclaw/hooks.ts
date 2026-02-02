/**
 * OpenClaw Hooks
 *
 * Provides auto-backup functionality for OpenClaw
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { MembaseConfig } from '../lib/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMBASE_SKILL = join(__dirname, '../../skills/membase/membase.ts');

export function createMembaseHooks(config: MembaseConfig) {
  let lastBackupTime = 0;

  return {
    /**
     * Auto-backup hook triggered when agent ends
     */
    onAgentEnd: async () => {
      if (!config.autoBackup?.enabled) {
        return;
      }

      // Check minimum interval
      const now = Date.now();
      const minInterval = (config.autoBackup.minInterval || 3600) * 1000;

      if (now - lastBackupTime < minInterval) {
        console.log('⏭️  Skipping auto-backup (too soon since last backup)');
        return;
      }

      try {
        console.log('[SYNC] Starting auto-backup...');

        // Call skill's backup command with incremental flag
        execSync(`node "${MEMBASE_SKILL}" backup --incremental --no-json`, {
          stdio: 'inherit',
          env: {
            ...process.env,
            // Use env var for password in auto-backup
            MEMBASE_BACKUP_PASSWORD: process.env.MEMBASE_BACKUP_PASSWORD || ''
          }
        });

        lastBackupTime = now;
        console.log('[OK] Auto-backup completed');
      } catch (error) {
        console.error('[ERROR] Auto-backup failed:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw - auto-backup failure shouldn't break agent
      }
    }
  };
}
