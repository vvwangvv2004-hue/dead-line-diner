# Dead Line Diner — Kiroween 2026, Resurrection

**Telephone food ordering is dead. An AI order taker brings it back.**

A customer "calls" from a web phone, speaks or types an order, the AI
reads it back against a real menu, and the kitchen sees it live. No app
download, no account, no phone number, no payment — the whole demo runs
from one link.

- **Category:** Resurrection — bring your favorite dead technology back to life.
- **Stack:** Vue 3 (vendored, no CDN) + zero-dependency Node backend.
  Chosen over NestJS for Phase 1 so the prototype runs with one command
  anywhere; see `.kiro/specs/dead-line-diner/design.md` §2 for the recorded
  reasoning. Database: `data/menu.json` seed + runtime `data/orders.json`;
  no MySQL required.
- **Menu:** 10 bilingual dishes in `data/menu.json` — the single source of
  truth. The parser, server, and MCP stub all read the same file and never
  invent a dish or a price.
- **Voice:** browser Web Speech API (STT/TTS) with a typed-text fallback
  that works fully without a microphone.
- **Claude:** optional, key-gated (`ANTHROPIC_API_KEY`), always re-validated
  against the menu. Without a key the demo is complete — see
  `server/claude.mjs`. No live Claude call was made or verified in this VM.

## Run it

```bash
cd dead-line-diner
npm start          # http://localhost:3000  (PORT=3000 by default)
npm test           # unit + property tests (node --test)
npm run mcp        # MCP stub on stdio
```

Open http://localhost:3000 and use the three tabs: **📞 Call to order**,
**🍳 Kitchen**, **👤 Owner**.

Try typing in the phone view (no microphone needed):

> Two beef noodle soups and one bubble tea, please

The AI reads back the draft ($30.50), you confirm, and the order appears
on the kitchen wall with a ticket file in `data/tickets/`.

## API (curl smoke test)

```bash
curl -s localhost:3000/api/health
curl -s localhost:3000/api/menu | head -c 400
curl -s -X POST localhost:3000/api/parse -H 'content-type: application/json' \
  -d '{"text":"Two beef noodle soups and one bubble tea, please"}'
curl -s -X POST localhost:3000/api/orders -H 'content-type: application/json' \
  -d '{"confirmed":true,"channel":"web-phone","transcript":"Two beef noodle soups and one bubble tea","items":[{"dishId":"ghost-beef-noodle","qty":2},{"dishId":"banshee-bubble-tea","qty":1}]}'
curl -s localhost:3000/api/orders | head -c 600
```

## Verification (this VM, 2026-11-11, all run — see below)

- `npm test`: **12/12 pass, 0 fail** — unit tests + 500 deterministic
  random-basket property checks for totals and quantity bounds.
  (Two real bugs were found and fixed during this run: a parser bug that
  passed a dish object where the menu was expected, and a quantity window
  that picked up the previous dish's number. Both are covered by tests now.)
- Server E2E on port 3101: **pass** — `/api/health` ok,
  `claudeAvailable: false` (no key); menu 10 dishes, 1 out of stock;
  `POST /api/parse` "Two beef noodle soups and one bubble tea" →
  total **$30.50**; unknown dish surfaced, not invented; out-of-stock
  dish refused; order **without** `confirmed: true` rejected (400);
  order with confirmation created **DLD-1001, $30.50**; ticket file
  `data/tickets/TICKET-1001.txt` written; status patch to `cooking`
  persisted; SSE stream delivered the hello event; frontend HTML served
  (200) and vendored Vue served (200, 145,949 bytes); call log recorded.
- MCP smoke test: **pass** — `initialize`, `tools/list` (3 tools),
  `get_menu`, `lookup_dish` (found beef noodle, qty 2; unknown dish →
  `unknown: true`), `create_order` → DLD-1001.
- Hook scripts: `sh scripts/hook-on-save.sh` **pass** (syntax checks +
  12 tests); `node scripts/hook-new-order-ticket.js --order DLD-1001`
  **pass** (ticket rewritten).
- Runtime data was cleaned after verification (`data/orders.json` and
  `data/tickets/` removed); the repo ships in a fresh state.

**NOT verified (do not claim these work):** Web Speech API voice
input/output in a real browser (the typed-text fallback is verified; the
microphone path is browser-dependent and was not exercised here); a live
Claude API call (no key was used, no account contacted); Kiro's exact
hook JSON schema (see `.kiro/hooks/README.md`); deployment to a public
URL; the Devpost/GitHub submission itself (manual steps below).

## Demo script (< 3 minutes, for the YouTube video)

| Time | Show |
|---|---|
| 0:00–0:20 | The dead tech: "You used to call the restaurant. Now you need an app." Show the phone dialling. |
| 0:20–1:00 | Type/speak: "Two beef noodle soups and one bubble tea." AI reads back $30.50. Confirm. Order DLD-1001 appears. |
| 1:00–1:40 | Kitchen wall: new-order alert, ticket file, status new → cooking → ready. |
| 1:40–2:20 | Owner view: toggle sesame balls out of stock, try ordering them — refused. Show call log/transcript. |
| 2:20–2:50 | How Kiro was used: specs, steering, hooks, MCP, property tests — show `.kiro/`. Close with the live URL. |

## Submission checklist

- [ ] Public GitHub repo, MIT license, `/.kiro` at root, not in `.gitignore`
- [ ] Working app URL (one-process deploy; judges need no sign-in)
- [ ] YouTube demo video, public, under 3 minutes, no copyrighted music
- [ ] Devpost text description + Kiro usage write-up (from `design.md` §5)
- [ ] Category: Resurrection, one category only
- [ ] Bonus (optional): blog post + social post starting `#KiroweenHackathon26`

Key dates (Taipei time): credit request by **Dec 2, 04:00**; submit by
**Dec 5, 06:00** (Dec 4, 2:00 PM PT). Aim to submit by **Dec 3**.

## Credit-form copy (paste into the form)

- **Category:** Resurrection
- **Project description:** Dead Line Diner revives telephone food ordering
  with an AI order taker. Customers call from a web phone, speak or type
  their order, and the AI reads it back against a real menu and confirms it
  before sending it to a live kitchen dashboard with order status tracking
  and printed tickets. Built with Kiro specs, steering, hooks, MCP, and
  property-based tests; the menu is the single source of truth and the AI
  never invents a dish or a price.

## What is OUT (MVP cut line)

Real PSTN/Twilio phone line, real payment (incl. WeChat Pay), user
accounts/login, multi-restaurant support, delivery routing. See
`.kiro/specs/dead-line-diner/requirements.md`.
