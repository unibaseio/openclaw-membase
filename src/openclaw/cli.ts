/**
 * OpenClaw CLI Wrapper
 *
 * Wraps the membase skill CLI for OpenClaw's plugin system
 * Provides "openclaw membase <command>" commands
 */

import type { Command } from 'commander';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMBASE_SKILL = join(__dirname, '../../skills/membase/membase.ts');

export function registerMembaseCli() {
  return ({ program }: { program: Command }) => {
    const membase = program
      .command('membase')
      .description('Encrypted memory backup and restore via Membase');

    // openclaw membase backup
    membase
      .command('backup')
      .description('Backup local memories to Membase (encrypted)')
      .option('-p, --password <password>', 'Encryption password')
      .option('--no-validate', 'Skip password strength validation')
      .option('-i, --incremental', 'Incremental backup')
      .action(async (opts) => {
        const args = ['backup'];
        if (opts.password) args.push('--password', opts.password);
        if (opts.validate === false) args.push('--no-validate');
        if (opts.incremental) args.push('--incremental');

        try {
          execSync(`node "${MEMBASE_SKILL}" ${args.join(' ')}`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });

    // openclaw membase restore
    membase
      .command('restore <backup-id>')
      .description('Restore memories from Membase backup')
      .option('-p, --password <password>', 'Decryption password')
      .action(async (backupId, opts) => {
        const args = ['restore', backupId];
        if (opts.password) args.push('--password', opts.password);

        try {
          execSync(`node "${MEMBASE_SKILL}" ${args.join(' ')}`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });

    // openclaw membase list
    membase
      .command('list')
      .description('List available backups')
      .action(async () => {
        try {
          execSync(`node "${MEMBASE_SKILL}" list`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });

    // openclaw membase diff
    membase
      .command('diff <backup-id-1> <backup-id-2>')
      .description('Compare two backups')
      .option('-p, --password <password>', 'Decryption password')
      .action(async (backupId1, backupId2, opts) => {
        const args = ['diff', backupId1, backupId2];
        if (opts.password) args.push('--password', opts.password);

        try {
          execSync(`node "${MEMBASE_SKILL}" ${args.join(' ')}`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });

    // openclaw membase status
    membase
      .command('status')
      .description('Show backup status')
      .action(async () => {
        try {
          execSync(`node "${MEMBASE_SKILL}" status`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });

    // openclaw membase cleanup
    membase
      .command('cleanup')
      .description('Clean up old backups')
      .option('--keep-last <n>', 'Keep last N backups', '10')
      .option('--dry-run', 'Show what would be deleted')
      .action(async (opts) => {
        const args = ['cleanup'];
        args.push('--keep-last', opts.keepLast);
        if (opts.dryRun) args.push('--dry-run');

        try {
          execSync(`node "${MEMBASE_SKILL}" ${args.join(' ')}`, {
            stdio: 'inherit',
            env: process.env
          });
        } catch (error) {
          process.exit(1);
        }
      });
  };
}
