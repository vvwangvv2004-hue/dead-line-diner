// tests/order.test.mjs — run with: npm test  (node --test tests/)
// Covers: totals, quantities, price math, parser, out-of-stock, unknown dishes.
// Property-style checks use a deterministic LCG so runs are reproducible.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeTotal, formatReadback, parseOrderText, round2, validateLines } from "../server/orderLogic.mjs";

const menu = JSON.parse(readFileSync(new URL("../data/menu.json", import.meta.url), "utf8")).dishes;
const byId = (id) => menu.find((d) => d.id === id);

// Deterministic pseudo-random generator (LCG) — reproducible "property" runs.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

test("computeTotal: single dish, exact cents", () => {
  assert.equal(computeTotal([{ dish: byId("ghost-beef-noodle"), qty: 1 }]), 12.5);
  assert.equal(computeTotal([{ dish: byId("zombie-egg-tart"), qty: 3 }]), 12);
});

test("computeTotal: mixed basket equals sum of price*qty", () => {
  const lines = [
    { dish: byId("ghost-beef-noodle"), qty: 2 },
    { dish: byId("banshee-bubble-tea"), qty: 1 },
    { dish: byId("cursed-cucumber"), qty: 3 },
  ];
  assert.equal(computeTotal(lines), 2 * 12.5 + 5.5 + 3 * 6);
});

test("property: total is always the exact sum, for 500 random baskets", () => {
  const rand = lcg(20261111);
  const inStock = menu.filter((d) => !d.outOfStock);
  for (let i = 0; i < 500; i++) {
    const n = 1 + Math.floor(rand() * 4);
    const lines = [];
    let expected = 0;
    for (let j = 0; j < n; j++) {
      const dish = inStock[Math.floor(rand() * inStock.length)];
      const qty = 1 + Math.floor(rand() * 9);
      lines.push({ dish, qty });
      expected += dish.price * qty;
    }
    assert.equal(computeTotal(lines), round2(expected));
    // No negative or fractional-cent totals.
    assert.ok(computeTotal(lines) >= 0);
    assert.equal(computeTotal(lines), Math.round(computeTotal(lines) * 100) / 100);
  }
});

test("property: quantity bounds — qty 0 and qty 10 are rejected, 1..9 accepted", () => {
  for (const qty of [0, 10, -1, 1.5, "two"]) {
    const { errors } = validateLines([{ dishId: "ghost-beef-noodle", qty }], menu);
    assert.equal(errors.length, 1, `qty ${qty} should be rejected`);
  }
  for (let qty = 1; qty <= 9; qty++) {
    const { lines, errors } = validateLines([{ dishId: "ghost-beef-noodle", qty }], menu);
    assert.deepEqual(errors, []);
    assert.equal(lines[0].qty, qty);
  }
});

test("validateLines: unknown dish is rejected, never priced", () => {
  const { lines, errors } = validateLines([{ dishId: "unicorn-pizza", qty: 1 }], menu);
  assert.equal(lines.length, 0);
  assert.match(errors[0], /unknown dish/);
});

test("validateLines: out-of-stock dish is rejected", () => {
  const { lines, errors } = validateLines([{ dishId: "lantern-sesame-balls", qty: 1 }], menu);
  assert.equal(lines.length, 0);
  assert.match(errors[0], /out of stock/);
});

test("validateLines: empty order is rejected", () => {
  assert.equal(validateLines([], menu).errors.length, 1);
});

test("parseOrderText: English quantities", () => {
  const { lines } = parseOrderText("Two beef noodle soups and one bubble tea, please", menu);
  assert.equal(lines.find((l) => l.dish.id === "ghost-beef-noodle")?.qty, 2);
  assert.equal(lines.find((l) => l.dish.id === "banshee-bubble-tea")?.qty, 1);
});

test("parseOrderText: digit quantities and Chinese names", () => {
  const { lines } = parseOrderText("3份水饺, 1个红烧牛肉面", menu);
  assert.equal(lines.find((l) => l.dish.id === "phantom-dumplings")?.qty, 3);
  assert.equal(lines.find((l) => l.dish.id === "ghost-beef-noodle")?.qty, 1);
});

test("parseOrderText: out-of-stock dish is excluded and flagged", () => {
  const { lines, errors } = parseOrderText("one sesame balls please", menu);
  assert.equal(lines.length, 0);
  assert.match(errors.join(" "), /out of stock/);
});

test("parseOrderText: unknown food is surfaced, not invented", () => {
  const { lines, unknown } = parseOrderText("one unicorn pizza please", menu);
  assert.equal(lines.length, 0);
  assert.equal(unknown.length, 1);
});

test("formatReadback: lists every line and the exact total", () => {
  const lines = [
    { dish: byId("ghost-beef-noodle"), qty: 2 },
    { dish: byId("banshee-bubble-tea"), qty: 1 },
  ];
  const text = formatReadback(lines, computeTotal(lines));
  assert.match(text, /Ghost Beef Noodle Soup/);
  assert.match(text, /\$30\.50/);
});
