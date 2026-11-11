# Structure steering — Dead Line Diner

```
dead-line-diner/
├── README.md                  Run commands, demo script, checklist, credit-form copy
├── LICENSE                    MIT
├── package.json               scripts: start / test / mcp (no dependencies)
├── .gitignore                 node_modules, .env, runtime order data — NOT .kiro
├── data/
│   └── menu.json              THE menu — single source of truth (committed)
│   ├── orders.json            runtime order/call store (gitignored)
│   └── tickets/               kitchen ticket files (gitignored, generated)
├── public/
│   ├── index.html             Vue 3 app: phone / kitchen / owner views
│   └── vendor/vue.global.js   Vue 3.4.31, vendored (MIT)
├── server/
│   ├── server.mjs             HTTP + SSE API, ticket writer
│   ├── orderLogic.mjs         parse / validate / total / read-back (shared)
│   └── claude.mjs             optional Claude assist (key-gated)
├── mcp-server/
│   ├── server.mjs             MCP stub: get_menu / lookup_dish / create_order
│   └── README.md              how Kiro calls it
├── tests/
│   └── order.test.mjs         unit + property tests (node:test)
└── .kiro/
    ├── specs/dead-line-diner/ requirements.md, design.md, tasks.md
    ├── steering/              product.md, tech.md, structure.md
    └── hooks/                 on-save.json, on-new-order.json (+ README)
```

## Conventions
- Specs live in `.kiro/specs/dead-line-diner/`; steering in
  `.kiro/steering/`; hooks in `.kiro/hooks/`. Do not move them.
- `/.kiro` must stay at the repo root and must never be added to
  `.gitignore` — Devpost disqualification risk if it is hidden.
- The menu file is the only place dishes and prices are defined.
  Frontend, server, MCP, and tests all read it; none hard-code a price.
- Generated runtime files (`data/orders.json`, `data/tickets/`) are
  gitignored and are never part of the submitted repo content.
