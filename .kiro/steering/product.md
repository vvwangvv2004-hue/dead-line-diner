# Product steering — Dead Line Diner

## What this is
Dead Line Diner revives telephone food ordering with an AI order taker.
A customer "calls" from a web phone, speaks or types an order, the AI
reads it back, and the kitchen sees it live. Category: Resurrection.

## Product rules (non-negotiable)
1. **The menu is the only source of truth.** Dishes and prices come only
   from `data/menu.json`. Never invent a dish, a price, or an allergen.
   If the caller names something not on the menu, say so and ask them to
   repeat — do not guess, do not substitute.
2. **Confirm before ordering.** No order exists until the caller explicitly
   confirms the full read-back (every line + exact total). A draft is not
   an order and must never appear on the kitchen wall.
3. **Money must be exact.** Total = sum of `price × qty`, 2 decimal places.
   Quantities are integers 1–9. Any violation is rejected with a reason.
4. **Out of stock is a hard stop.** An out-of-stock dish is refused, not
   replaced, not back-ordered.
5. **The demo must work with no account, no phone number, no payment,
   no microphone.** Typed text is a first-class path. Real PSTN and real
   payment are explicitly out of scope for the MVP.
6. **One diner, one menu.** Do not add multi-restaurant support, delivery
   routing, or user accounts in this project.

## Voice and tone
- The AI order taker is warm, brief, and precise. It reads back the whole
  order every time before asking for confirmation.
- The diner is a little bit haunted (Halloween, Kiroween) but the food is
  serious: dish names can be playful, prices and allergens must be exact.
- The UI is bilingual (English + Chinese dish names) because the menu is.
