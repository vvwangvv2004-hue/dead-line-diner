# Hooks — Dead Line Diner

## What is here
- `on-save.json` — **config**: run `npm test` on every file save.
- `on-new-order.json` — **config**: generate a kitchen ticket when a new
  order is confirmed.
- `../scripts/hook-on-save.sh` — **runnable script**: the same save check,
  runnable in a plain terminal.
- `../scripts/hook-new-order-ticket.js` — **runnable script**: the same
  ticket step, standalone.

## Honest note (read this)
The two `.json` files are Kiro hook *configs in the shape this project
proposes* — they were **not** verified against Kiro's exact hook JSON
schema in this VM (Kiro was not installed here and no account was used).
Before submitting, open them in Kiro and let Kiro validate/convert them
to its native hook format; the behaviour they describe is what matters,
and both behaviours are already implemented and verified in the prototype:
the test suite runs (`npm test`), and the server writes a ticket file for
every confirmed order (`writeTicket()` in `server/server.mjs`, output in
`data/tickets/`). The runnable scripts in `scripts/` are the verified,
working versions of the same two steps.
