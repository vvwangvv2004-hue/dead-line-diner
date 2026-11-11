#!/bin/sh
# hook-on-save.sh — runnable version of .kiro/hooks/on-save.json
# Usage: sh scripts/hook-on-save.sh
set -e
cd "$(dirname "$0")/.."
node --check server/server.mjs
node --check server/orderLogic.mjs
node --check mcp-server/server.mjs
npm test
