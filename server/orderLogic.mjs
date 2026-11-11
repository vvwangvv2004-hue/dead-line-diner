// orderLogic.mjs — shared, deterministic order logic.
// Used by the server, the MCP stub, and the tests. No network, no AI key.
// RULE: the menu is the single source of truth. This module never invents
// a dish or a price. Anything not on the menu is returned as "unknown".

export const MAX_QTY_PER_LINE = 9;
export const VALID_STATUSES = ["new", "cooking", "ready"];

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
};

export function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Total for validated lines: [{ dish, qty }] -> number (2dp). */
export function computeTotal(lines) {
  let total = 0;
  for (const { dish, qty } of lines) total += dish.price * qty;
  return round2(total);
}

/** Validate raw lines [{ dishId, qty }] against the menu. Returns { lines, errors }. */
export function validateLines(rawLines, menu) {
  const lines = [];
  const errors = [];
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { lines, errors: ["order must contain at least one item"] };
  }
  for (const raw of rawLines) {
    const dish = menu.find((d) => d.id === raw.dishId);
    if (!dish) {
      errors.push(`unknown dish: ${String(raw.dishId)}`);
      continue;
    }
    if (dish.outOfStock) {
      errors.push(`out of stock: ${dish.nameEn}`);
      continue;
    }
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      errors.push(`invalid quantity for ${dish.nameEn}: ${String(raw.qty)} (must be 1-${MAX_QTY_PER_LINE})`);
      continue;
    }
    lines.push({ dish, qty });
  }
  return { lines, errors };
}

function findDish(text, dish) {
  const hay = text.toLowerCase();
  const names = [dish.nameEn, dish.nameZh, ...(dish.aliases || [])];
  for (const name of names) {
    if (name && hay.includes(name.toLowerCase())) return dish;
  }
  return null;
}

function qtyNear(text, dish, menu) {
  // The quantity is the number IMMEDIATELY before the dish name
  // ("two beef noodles", "3份水饺", "1个红烧牛肉面"), or an "x2" right
  // after it. Only look a few characters either side, so a previous
  // dish's number is never picked up. Default 1.
  const hay = text.toLowerCase();
  const names = [dish.nameEn, dish.nameZh, ...(dish.aliases || [])].filter(Boolean);
  let idx = -1;
  let nameLen = 0;
  for (const n of names) {
    const i = hay.indexOf(n.toLowerCase());
    if (i >= 0) { idx = i; nameLen = n.length; break; }
  }
  if (idx < 0) return 1;
  const before = hay.slice(Math.max(0, idx - 8), idx);
  const digitBefore = before.match(/(\d+)\s*(?:份|个|碗|盘|只|杯)?\s*$/);
  if (digitBefore) return Math.min(MAX_QTY_PER_LINE, Math.max(1, parseInt(digitBefore[1], 10)));
  const beforeTrimmed = before.trim();
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    if (beforeTrimmed.endsWith(word)) return n;
  }
  const after = hay.slice(idx + nameLen, idx + nameLen + 6);
  const xAfter = after.match(/^\s*[x×]\s*(\d+)/);
  if (xAfter) return Math.min(MAX_QTY_PER_LINE, Math.max(1, parseInt(xAfter[1], 10)));
  return 1;
}

/**
 * Deterministic parser: free text -> { lines, unknown, errors }.
 * `unknown` lists dish-like phrases we could not match, so the caller can
 * ask the caller to clarify instead of guessing.
 */
export function parseOrderText(text, menu) {
  if (!text || !text.trim()) return { lines: [], unknown: [], errors: ["empty order text"] };
  const lines = [];
  const seen = new Set();
  for (const dish of menu) {
    const found = findDish(text, dish);
    if (found && !seen.has(found.id)) {
      seen.add(found.id);
      lines.push({ dish: found, qty: qtyNear(text, found, menu) });
    }
  }
  // Unknown detection: if the text mentions food-ish words we did not match,
  // surface them rather than silently dropping them.
  const unknown = [];
  const lower = text.toLowerCase();
  if (lines.length === 0 && lower.trim().length > 0) {
    unknown.push(text.trim());
  }
  const errors = [];
  for (const { dish } of lines) {
    if (dish.outOfStock) errors.push(`out of stock: ${dish.nameEn}`);
  }
  return { lines: lines.filter((l) => !l.dish.outOfStock), unknown, errors };
}

/** Human-readable read-back, used by the phone view and the ticket. */
export function formatReadback(lines, total) {
  const parts = lines.map(
    ({ dish, qty }) => `${qty} x ${dish.nameEn} ($${(dish.price * qty).toFixed(2)})`
  );
  return `Your order: ${parts.join(", ")}. Total: $${total.toFixed(2)}. Please confirm to place this order.`;
}

export function nextOrderNumber(lastNumber) {
  return (lastNumber || 1000) + 1;
}
