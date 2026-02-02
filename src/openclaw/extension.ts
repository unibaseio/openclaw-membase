/**
 * OpenClaw Extension Entry Point
 *
 * Creates the Membase extension for OpenClaw with CLI and hooks
 */

import { registerMembaseCli } from './cli.js';
import { createMembaseHooks } from './hooks.js';
import type { MembaseConfig } from '../lib/types.js';

export function createMembaseExtension(config: MembaseConfig) {
  return {
    name: 'memory-membase',
    version: '1.0.0',
    description: 'Encrypted memory backup and restore via Membase',

    // Register CLI commands
    cli: registerMembaseCli(),

    // Register hooks
    hooks: createMembaseHooks(config)
  };
}

// Default export for OpenClaw plugin system
export default createMembaseExtension;
