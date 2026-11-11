# Dead Line Diner — Requirements

**Project:** Dead Line Diner
**Category:** Resurrection (Kiroween 2026)
**One-line pitch:** Telephone food ordering is dead. An AI order taker brings it back:
a customer "calls" from a web phone, speaks or types an order, the AI reads
it back against a real menu, and the kitchen sees it live.
**Status:** Phase 1 prototype (this repo). Submission deadline: Dec 4, 2026,
2:00 PM PT (Taipei Dec 5, 06:00).

## Glossary
- **Caller:** the customer on the web phone.
- **AI order taker:** the voice/text dialogue that parses an order.
- **Menu:** `data/menu.json` — the single source of truth for dishes and prices.
- **Draft order:** a parsed order not yet confirmed; it does not exist as an order.
- **Order:** a confirmed order with an id (`DLD-1001`…), items, total, status.
- **Kitchen wall:** the live dashboard showing orders and their status.

## MVP cut line — what is OUT (explicitly)
- OUT-1: Real PSTN / Twilio / any real phone line. The demo phone is a
  browser simulation. A real line is a stretch goal only, documented in
  `design.md`, and is never required for the demo or the judging.
- OUT-2: Real payment (no card, no WeChat Pay, no Alipay). Orders are
  pay-at-pickup in the story; the demo collects no payment data.
- OUT-3: User accounts / login. The demo has no auth; judges test without
  signing in. (Test credentials are therefore not needed.)
- OUT-4: Multi-restaurant support. One diner, one menu.
- OUT-5: Delivery routing / driver tracking.

## Functional requirements

### REQ-1 — Web phone (customer)
- REQ-1.1: WHEN a caller opens the app, THE SYSTEM SHALL show a phone view
  with a dial action, the menu, and a typed-text input.
- REQ-1.2: WHEN a caller dials, THE SYSTEM SHALL greet them and accept
  voice input (Web Speech API) or typed text as an equal fallback.
- REQ-1.3: WHEN the caller speaks or types an order, THE SYSTEM SHALL parse
  it deterministically against the menu (dish names/aliases, quantities)
  and show a draft read-back with every line and the exact total.
- REQ-1.4: WHEN the parsed text names a dish that is not on the menu,
  THE SYSTEM SHALL say so and ask for clarification, and SHALL NOT add
  any dish to the draft.
- REQ-1.5: WHEN a dish is out of stock, THE SYSTEM SHALL refuse that line
  and say the dish is unavailable, and SHALL NOT add it to the draft.
- REQ-1.6: WHEN the caller confirms explicitly, THE SYSTEM SHALL create the
  order, return an order number and ETA, and speak the confirmation.
- REQ-1.7: WHEN the caller has not confirmed, THE SYSTEM SHALL NOT create
  an order, charge anything, or show the draft on the kitchen wall.

**Acceptance:** A caller can complete "two beef noodle soups and one bubble
tea" end-to-end in the browser with no microphone, and the total is $30.50.

### REQ-2 — Order math (the money must be right)
- REQ-2.1: THE SYSTEM SHALL compute an order total as the exact sum of
  `price × qty` over its lines, rounded to 2 decimal places.
- REQ-2.2: THE SYSTEM SHALL accept quantities 1–9 per line and reject
  0, 10+, non-integers, and non-numeric quantities.
- REQ-2.3: THE SYSTEM SHALL reject an order with no valid lines.
- REQ-2.4: THE SYSTEM SHALL never price a dish that is not on the menu.

**Acceptance:** `npm test` passes, including 500 deterministic random-basket
property checks of REQ-2.1 and the quantity bounds of REQ-2.2.

### REQ-3 — Kitchen dashboard
- REQ-3.1: WHEN an order is confirmed, THE SYSTEM SHALL show it on the
  kitchen wall within 2 seconds (SSE live update; polling fallback on load).
- REQ-3.2: THE SYSTEM SHALL show a new-order alert (visual + sound is
  optional; visual is required).
- REQ-3.3: THE SYSTEM SHALL let kitchen staff move an order
  `new → cooking → ready`, and persist the status.
- REQ-3.4: WHEN an order is confirmed, THE SYSTEM SHALL write a plain-text
  kitchen ticket (`data/tickets/TICKET-<number>.txt`) — the simulated print.

**Acceptance:** Create an order via curl; the kitchen view shows it, the
ticket file exists, and the status change survives a server restart.

### REQ-4 — Owner menu page
- REQ-4.1: THE SYSTEM SHALL let the owner toggle a dish out of stock /
  back in stock, and the phone view SHALL reflect the change immediately.
- REQ-4.2: THE SYSTEM SHALL show call logs (transcript + order number +
  time) and order history on the owner page.
- REQ-4.3: THE SYSTEM SHALL persist menu edits to `data/menu.json`.

**Acceptance:** Toggle sesame balls out of stock; a caller ordering them is
refused with an out-of-stock message.

### REQ-5 — Menu as single source of truth
- REQ-5.1: THE SYSTEM SHALL load dishes only from `data/menu.json` in the
  HTTP server, the MCP server, and the order parser (one file, three readers).
- REQ-5.2: THE SYSTEM SHALL include, for every dish: id, English name,
  Chinese name, price (USD), allergens, out-of-stock flag.
- REQ-5.3: THE MENU SHALL contain 8–10 dishes. (Phase 1: 10 dishes, one
  out of stock to demonstrate REQ-1.5.)

### REQ-6 — Claude integration point (honest boundary)
- REQ-6.1: THE SYSTEM SHALL work fully with no AI key, using the
  deterministic parser only.
- REQ-6.2: IF `ANTHROPIC_API_KEY` is set, THE SYSTEM MAY ask Claude to
  parse an order, BUT SHALL re-validate Claude's answer with the same
  rules as REQ-2 and REQ-5, and SHALL reject any invented dish or price.
- REQ-6.3: THE SYSTEM SHALL NOT claim a live Claude call works without a
  key, and SHALL surface `claudeAvailable: false` on `/api/health`.

### REQ-7 — Submission artefacts (Kiroween rules)
- REQ-7.1: THE REPO SHALL be public on GitHub with an open-source license
  (MIT, this repo) visible in the About section.
- REQ-7.2: THE REPO SHALL contain `/.kiro` at its root (specs, steering,
  hooks) and SHALL NOT list it in `.gitignore`.
- REQ-7.3: THE SUBMISSION SHALL include a working app URL, a public
  YouTube demo video under 3 minutes, a text description, and a write-up
  of how Kiro was used.
- REQ-7.4: THE PROJECT SHALL be new — built during the submission period
  (Oct 30–Dec 4, 2026). No pre-existing client code is reused.

## Non-functional requirements
- NFR-1: The prototype SHALL run with `npm start` and no other install step
  (zero runtime dependencies; Vue 3 is vendored in `public/vendor/`).
- NFR-2: The demo SHALL work in a modern browser with no microphone
  (typed-text fallback) and no sign-in.
- NFR-3: All prices SHALL be in USD in the demo; the currency is a
  display choice, not a payment integration.
- NFR-4: No personal data is collected. Transcripts are stored locally in
  `data/orders.json` for the demo only.
