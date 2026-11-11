# Tech steering — Dead Line Diner

## Stack (Phase 1, decided)
- **Frontend:** Vue 3.4.31, vendored at `public/vendor/vue.global.js`
  (MIT). No build step, no CDN at runtime.
- **Backend:** Node.js (stdlib only, zero runtime dependencies). One
  process serves the frontend and the JSON API + SSE. Start: `npm start`.
- **Data:** `data/menu.json` (committed seed, single source of truth);
  orders persisted to `data/orders.json` (runtime file, gitignored).
- **Tests:** `node --test` (`npm test`). No test framework dependency.
- **MCP:** `mcp-server/server.mjs`, stdio JSON-RPC, same menu + logic.

## Why not NestJS in Phase 1 (recorded decision)
The user asked for Vue 3 + NestJS if feasible. Phase 1 uses a
zero-dependency Node backend instead, because a hackathon prototype must
run with one command on any machine and on a free host. The backend is
structured like Nest modules (one file per concern: `orderLogic`,
`claude`, `server`), so migrating to NestJS later is mechanical.
Do not re-litigate this in Phase 1; note it in the design doc instead.

## Rules
1. **No new runtime dependencies in Phase 1.** If a dependency is needed,
   say why in `design.md` first.
2. **Shared logic, one implementation.** Order parsing, validation, and
   totals live only in `server/orderLogic.mjs`. The HTTP server, the MCP
   server, and the tests all import it — never duplicate the math.
3. **Claude is gated and re-validated.** `server/claude.mjs` runs only
   with `ANTHROPIC_API_KEY` set, and its output always goes through
   `validateLines()` before it can affect an order.
4. **No secrets in the repo.** Keys come from the environment only.
   `.env` is gitignored. Never print a key in logs.
5. **Errors are explicit.** Unknown dishes, out-of-stock lines, and bad
   quantities return a reason string; they are never silently dropped or
   silently corrected.
6. **Keep the demo deployable as one process.** Do not split the frontend
   and backend into separate deployments for the submission.
