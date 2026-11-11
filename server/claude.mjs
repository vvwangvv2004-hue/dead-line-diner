// claude.mjs — Claude integration point (NOT a live call without a key).
//
// How it is meant to work (via Kiro / Claude in the IDE):
//   1. The caller first runs the deterministic parser (orderLogic.parseOrderText).
//   2. If ANTHROPIC_API_KEY is set, parseWithClaude() is tried as an
//      enhancement: it receives ONLY the menu (dish ids, names, prices) and
//      the caller utterance, and must return dish ids + quantities as JSON.
//   3. Its result is ALWAYS re-validated with validateLines() — a Claude
//      answer that invents a dish or a price is rejected, never trusted.
//   4. If no key is set, this module returns null immediately and the
//      deterministic parser is the only path. The demo works fully without it.
//
// This file is honest scaffolding: it is NOT verified against a live API
// call in this VM (no key was used, no account was contacted).
// Env: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL (default claude-sonnet-4-5).

const API_URL = "https://api.anthropic.com/v1/messages";

export function claudeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseWithClaude(text, menu) {
  if (!claudeAvailable()) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  const menuText = menu
    .map((d) => `- ${d.id}: ${d.nameEn} (${d.nameZh}) $${d.price.toFixed(2)}${d.outOfStock ? " [OUT OF STOCK]" : ""}`)
    .join("\n");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content:
            `You are parsing a phone food order. Only use dishes from this menu, exactly by id. ` +
            `Never invent a dish or a price. Return ONLY JSON: {"lines":[{"dishId":"...","qty":1}]}.\n\n` +
            `MENU:\n${menuText}\n\nORDER TEXT:\n${text}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API returned ${res.status}`);
  const data = await res.json();
  const raw = data?.content?.[0]?.text || "";
  const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return json.lines || [];
}
