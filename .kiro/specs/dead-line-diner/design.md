# Dead Line Diner — Design

## 1. Concept
Resurrection: telephone ordering. In the 1990s you called the restaurant
and a person took your order. That channel died — apps and QR codes replaced
it, and anyone who cannot or will not use an app (older customers, people
with their hands full, a dead phone battery is not even needed: a voice is
enough) was left out. Dead Line Diner brings the phone call back, with an
AI order taker that never forgets a menu item, never mishears a price, and
never puts a caller on hold.

The demo deliberately uses a **browser phone**, not a real PSTN line:
a judge clicks a link, "calls", speaks or types, and watches the kitchen
wall update. That is the whole point of the design — the experience must
be testable in 60 seconds with no phone number, no account, no payment.

## 2. Architecture (Phase 1)

```
public/index.html          Vue 3.4.31 (vendored, public/vendor/)
  ├─ Phone view            dial → speak/type → draft → confirm
  ├─ Kitchen view          SSE live order wall, status buttons
  └─ Owner view            menu toggle, call logs, order history
        │  REST + SSE
server/server.mjs          Node stdlib only (no runtime dependencies)
  ├─ orderLogic.mjs        parse / validate / total / read-back
  ├─ claude.mjs            optional Claude assist (key-gated, re-validated)
  └─ data/menu.json        single source of truth
mcp-server/server.mjs      MCP stub (stdio JSON-RPC): get_menu,
                           lookup_dish, create_order — same menu + logic
tests/order.test.mjs       node:test, incl. 500-basket property checks
```

**Stack decision (recorded):** The user asked for Vue 3 + NestJS if feasible.
Phase 1 uses Vue 3 for the frontend and a zero-dependency Node backend
instead of NestJS. Reason: a hackathon prototype must run with one command
on any machine and on a free host, and the order logic is small enough that
NestJS adds setup cost without changing the design. The backend is
structured like Nest modules (one file per concern: menu, orders, parsing,
Claude) so a NestJS migration is a mechanical move, not a rewrite.
This is stated here so a judge never has to guess.

**Data:** in-memory orders + `data/orders.json` persistence (created at
runtime, gitignored). Menu is a committed seed file. No MySQL is required
to run the demo.

## 3. Key flows

### 3.1 Call flow
1. Caller dials → greeting (spoken via Web Speech TTS, also shown as text).
2. Caller speaks or types, e.g. "Two beef noodle soups and one bubble tea".
3. `POST /api/parse` → deterministic parser matches dishes/quantities
   against the menu; unknown dishes and out-of-stock lines are reported,
   never added.
4. Draft read-back with exact total is shown and spoken.
5. Caller confirms explicitly → `POST /api/orders {confirmed: true}` →
   order created, ticket written, SSE `new-order` broadcast, kitchen alert.
6. Order number + ETA returned and spoken.

### 3.2 Kitchen flow
SSE stream `/api/orders/stream` pushes `new-order` and `status` events.
Status transitions are `new → cooking → ready` via
`PATCH /api/orders/:id/status`. Each confirmed order writes
`data/tickets/TICKET-<number>.txt` (the simulated print).

### 3.3 Owner flow
`PATCH /api/menu/:id {outOfStock}` toggles stock and persists
`data/menu.json`; the phone view re-reads the menu on load and the
change is broadcast over SSE. Call logs are the stored transcripts
attached to orders (`GET /api/calls`).

## 4. Order parsing (deterministic first, Claude second)
- Parser matches dish names, Chinese names, and aliases, plus quantities
  from digits, English number words (one–nine), and Chinese numerals.
- Claude is an *enhancement*, never the authority: if a key is set,
  `parseWithClaude()` is tried, then its output is re-run through
  `validateLines()`. An invented dish/price is rejected and the
  deterministic result stands. Without a key the demo is complete.
- Web Speech API is used only for input/output in the browser; the typed
  fallback is a first-class path, not an error path.

## 5. Kiro usage (for the submission write-up)
- **Specs:** this directory — requirements, design, tasks.
- **Steering:** `.kiro/steering/product.md` (menu-is-truth, confirm-before-
  order), `tech.md` (stack + zero-dep decision), `structure.md` (repo map).
- **Hooks:** `.kiro/hooks/on-save.json` (lint + test on save) and
  `on-new-order.json` (kitchen ticket on new order); see the hooks README
  for which parts are config and which are runnable scripts.
- **MCP:** `mcp-server/` exposes the menu and order creation to Kiro so
  the agent reasons from the same menu file as the app.
- **PBT:** `tests/order.test.mjs` — property checks for totals and
  quantity bounds, run by the on-save hook.

## 6. Stretch goals (only after the MVP is submitted as a draft)
- S-1: Real phone line (Twilio) as an alternative channel into the same
  `POST /api/orders` endpoint. Must not change the core flow.
- S-2: Multilingual ordering (Mandarin speech recognition is already
  partially supported by the parser's Chinese names/numerals).
- S-3: Printer integration (ESC/POS) replacing the text ticket file.

## 7. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Web Speech API varies by browser | Typed fallback is equal; demo script uses typed input |
| AI "hallucinates" a dish/price | Deterministic validation after any Claude call; menu is the only source |
| Judge cannot test without a phone | Browser phone needs only a link; no sign-in, no number |
| Scope creep (payment, PSTN) | MVP cut line in requirements.md; stretch goals are post-draft only |
