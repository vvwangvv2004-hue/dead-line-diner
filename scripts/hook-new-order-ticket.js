// hook-new-order-ticket.js — runnable version of .kiro/hooks/on-new-order.json
// Usage: node scripts/hook-new-order-ticket.js --order DLD-1001
// Reads the order from data/orders.json and (re)writes its kitchen ticket.
// In the running server this step already happens inline on order creation.
import { promises as fs } from "node:fs";
import path from "node:path";

const orderId = process.argv[process.argv.indexOf("--order") + 1];
if (!orderId) { console.error("usage: node scripts/hook-new-order-ticket.js --order DLD-1001"); process.exit(1); }
const dataDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "data");
const saved = JSON.parse(await fs.readFile(path.join(dataDir, "orders.json"), "utf8"));
const order = (saved.orders || []).find((o) => o.id === orderId);
if (!order) { console.error(`order not found: ${orderId}`); process.exit(1); }
const lines = order.items.map((i) => `  ${i.qty} x ${i.nameEn} (${i.nameZh})  $${(i.price * i.qty).toFixed(2)}`).join("\n");
const text = `DEAD LINE DINER — KITCHEN TICKET\nOrder #${order.number}  (${order.id})  ${order.createdAt}\n----------------------------------------\n${lines}\n----------------------------------------\nTOTAL: $${order.total.toFixed(2)}   ETA: ${order.etaMinutes} min\nStatus: ${order.status}\n`;
await fs.mkdir(path.join(dataDir, "tickets"), { recursive: true });
const file = path.join(dataDir, "tickets", `TICKET-${order.number}.txt`);
await fs.writeFile(file, text);
console.log(`ticket written: ${file}`);
