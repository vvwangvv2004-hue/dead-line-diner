# MCP server stub — Dead Line Diner

Minimal MCP server over stdio (JSON-RPC). It shares the same menu file
(`../data/menu.json`) and the same deterministic order logic
(`../server/orderLogic.mjs`) as the HTTP server, so the menu stays the
single source of truth in every path.

## Tools

| Tool | What it does |
|---|---|
| `get_menu` | Full menu: id, bilingual names, price, allergens, stock flag |
| `lookup_dish` | Find a dish by name/alias; returns `unknown: true` if not on the menu |
| `create_order` | Validate lines and create an order; requires `confirmed: true` |

Orders created here live in this process only. The HTTP server
(`/api/orders`) is the kitchen's live store; for the demo, the phone view
uses the HTTP API, and Kiro uses this MCP server to look up the menu and
to reason about orders without ever inventing a dish or a price.

## Run

```bash
node mcp-server/server.mjs
# or
npm run mcp
```

## Smoke test

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_menu","arguments":{}}}' \
  '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"lookup_dish","arguments":{"query":"two beef noodle soups"}}}' \
  | node mcp-server/server.mjs
```

## How Kiro would call it

In Kiro, add this server to the workspace MCP config
(`Kiro: Open workspace MCP config (JSON)`):

```json
{
  "mcpServers": {
    "dead-line-diner": {
      "command": "node",
      "args": ["mcp-server/server.mjs"],
      "cwd": "<path to the dead-line-diner repo>"
    }
  }
}
```

Then ask Kiro to look up the menu or validate an order through the tools
above. The steering rule in `.kiro/steering/product.md` requires every
order to go through `lookup_dish` / `create_order` validation — never
from free-text memory.
