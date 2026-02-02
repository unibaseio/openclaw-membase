/**
 * OpenClaw Extension Entry Point
 *
 * This provides the OpenClaw Extension functionality (CLI + Hooks)
 * based on the core membase skill.
 */

import { createMembaseExtension } from './openclaw/extension.js';

// Default export for OpenClaw plugin system
export default createMembaseExtension;

// Named exports for advanced users
export { createMembaseExtension } from './openclaw/extension.js';
export { registerMembaseCli } from './openclaw/cli.js';
export { createMembaseHooks } from './openclaw/hooks.js';

// Export types
export type * from './lib/types.js';
