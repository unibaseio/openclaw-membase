#!/bin/bash
# Run all tests for memory-membase plugin

set -e  # Exit on error

echo "================================================"
echo "Memory-Membase Plugin - Test Suite"
echo "================================================"
echo ""

cd "$(dirname "$0")"

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✓ Using bun: $(bun --version)"
echo ""

# Test 1: Encryption module
echo "================================================"
echo "Test 1: Encryption Module"
echo "================================================"
bun run test-encryption.ts
echo ""

# Test 2: Membase HTTP client
echo "================================================"
echo "Test 2: Membase HTTP Client"
echo "================================================"
bun run test-membase-client.ts
echo ""

# Test 3: Full backup/restore integration
echo "================================================"
echo "Test 3: Full Backup/Restore Integration"
echo "================================================"
bun run test-backup-restore.ts
echo ""

echo "================================================"
echo "🎉 All Tests Completed!"
echo "================================================"
