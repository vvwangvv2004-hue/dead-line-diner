# Dead Line Diner — Tasks

Status: Phase 1 done in this repo unless marked otherwise.
Check off in order; do not start a later task's scope before its
prerequisites are green.

## Phase 1 — Prototype (done, verified in this VM)
- [x] 1. Menu seed: 10 bilingual dishes, prices, allergens, one out-of-stock
      (`data/menu.json`). Acceptance: REQ-5.
- [x] 2. Deterministic order logic: parse, validate, total, read-back
      (`server/orderLogic.mjs`). Acceptance: REQ-1.3–1.5, REQ-2.
- [x] 3. HTTP server: menu/orders/parse/SSE/status/menu-patch, ticket files
      (`server/server.mjs`). Acceptance: REQ-1.6–1.7, REQ-3, REQ-4.
- [x] 4. Vue 3 frontend: phone, kitchen, owner views; Web Speech + typed
      fallback (`public/index.html`, Vue vendored). Acceptance: REQ-1.1–1.2, NFR-2.
- [x] 5. Tests: unit + 500-basket property checks (`tests/order.test.mjs`).
      Acceptance: REQ-2.4; run `npm test`.
- [x] 6. MCP stub: get_menu / lookup_dish / create_order
      (`mcp-server/server.mjs`). Acceptance: smoke test in its README.
- [x] 7. Claude integration point, key-gated and re-validated
      (`server/claude.mjs`). Acceptance: REQ-6; `/api/health` reports
      `claudeAvailable: false` with no key.
- [x] 8. Kiro pack: specs, steering, hooks, README, LICENSE, .gitignore.
      Acceptance: REQ-7.2; `/.kiro` is not in `.gitignore`.
- [x] 9. End-to-end verification in this VM: server start, curl full flow,
      SSE, ticket file, tests. Results recorded in `README.md`.

## Phase 2 — Manual steps (the user must do these himself; agent cannot)
- [ ] 10. Devpost: register and click Join at https://kiroween.devpost.com/
      — profile name must match the government ID exactly.
- [ ] 11. Kiro: register at https://app.kiro.dev/signin; copy the User ID
      from https://kiro.dev/account/usage.
- [ ] 12. Credit form: https://forms.gle/ykuadfNyNdWdbJfH9 — Category
      Resurrection, project description from `README.md` ("Credit-form copy").
      Then Didit ID check (government ID photo + selfie).
      Deadline: Dec 1, 12:00 PM PT (Taipei Dec 2, 04:00). Allow 48 business
      hours for review; submit the form as early as possible.
- [ ] 13. GitHub: create a NEW public repo, MIT license, push this folder,
      confirm `/.kiro` is visible at the repo root and not gitignored.
- [ ] 14. Deploy the app to a public URL (one-command host; keep the
      single-process server — do not split frontend/backend for the demo).
      Record the URL; judges must reach it with no sign-in.

## Phase 3 — Polish (after Phase 2 is underway)
- [ ] 15. In Kiro, use the credits to iterate: run the spec tasks in this
      file through Kiro's spec workflow; keep steering and hooks in use so
      the Kiro-usage write-up is evidence, not a claim.
- [ ] 16. Record the <3 min demo video (script in `README.md`), upload to
      YouTube as public, no copyrighted music or trademarks.
- [ ] 17. Write the Devpost text description + Kiro usage write-up from
      `design.md` section 5; add the working URL, GitHub URL, video link.
- [ ] 18. Bonus prizes (optional, cheap): Bonus Blog post on a third-party
      blog mentioning Kiroween 2026; Social Blitz post starting with
      `#KiroweenHackathon26`; add both links to the submission form.
- [ ] 19. Save a Devpost draft early; final submit by Dec 3 (not Dec 4 —
      leave a buffer). Submission closes Dec 4, 2:00 PM PT (Taipei Dec 5, 06:00).

## Phase 4 — Stretch (only if Phase 3 is submitted as a draft)
- [ ] 20. Twilio real-phone channel into the same `POST /api/orders`
      endpoint (design.md S-1). If it is not working by Dec 2, cut it —
      the browser phone is the submission.
- [ ] 21. ESC/POS printer ticket instead of the text ticket file.
