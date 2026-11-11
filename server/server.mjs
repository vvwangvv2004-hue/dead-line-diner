// server.mjs — Dead Line Diner prototype backend.
// Zero external dependencies (Node stdlib only). Serves the Vue 3 frontend
// from public/ and a small JSON API. Run: `node server/server.mjs`
// Env: PORT (default 3000), ANTHROPIC_API_KEY (optional, see claude.mjs),
// DATA_DIR (default ./data).

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeTotal, formatReadback, nextOrderNumber, parseOrderText, validateLines } from "./orderLogic.mjs";
import { claudeAvailable, parseWithClaude } from "./claude.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const TICKETS_DIR = path.join(DATA_DIR, "tickets");

const menuData = JSON.parse(await fs.readFile(path.join(DATA_DIR, "menu.json"), "utf8"));
const menu = menuData.dishes;

let orders = [];
let calls = [];
let lastOrderNumber = 1000;
try {
  const saved = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8"));
  orders = saved.orders || [];
  calls = saved.calls || [];
  lastOrderNumber = saved.lastOrderNumber || 1000;
} catch { /* first run: start empty */ }

const sseClients = new Set();

async function persist() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify({ orders, calls, lastOrderNumber }, null, 2));
}

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

/** Kitchen ticket: plain-text file, the "simulated print" for the demo. */
async function writeTicket(order) {
  await fs.mkdir(TICKETS_DIR, { recursive: true });
  const lines = order.items
    .map((i) => `  ${i.qty} x ${i.nameEn} (${i.nameZh})  $${(i.price * i.qty).toFixed(2)}`)
    .join("\n");
  const text =
    `DEAD LINE DINER — KITCHEN TICKET\n` +
    `Order #${order.number}  (${order.id})  ${new Date(order.createdAt).toLocaleString()}\n` +
    `Channel: ${order.channel}\n` +
    `----------------------------------------\n${lines}\n` +
    `----------------------------------------\nTOTAL: $${order.total.toFixed(2)}   ETA: ${order.etaMinutes} min\n` +
    `Status: ${order.status}\n`;
  const file = path.join(TICKETS_DIR, `TICKET-${order.number}.txt`);
  await fs.writeFile(file, text);
  return file;
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const { pathname } = url;

    // --- static frontend ---
    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      const html = await fs.readFile(path.join(ROOT, "public", "index.html"));
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(html);
    }
    if (req.method === "GET" && pathname.startsWith("/vendor/")) {
      const file = path.join(ROOT, "public", pathname);
      if (!file.startsWith(path.join(ROOT, "public"))) return sendJson(res, 403, { error: "forbidden" });
      const body = await fs.readFile(file);
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(body);
    }

    // --- API ---
    if (req.method === "GET" && pathname === "/api/menu") return sendJson(res, 200, { restaurant: menuData.restaurant, dishes: menu });
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, claudeAvailable: claudeAvailable(), orders: orders.length });
    }
    if (req.method === "GET" && pathname === "/api/orders") return sendJson(res, 200, { orders });
    if (req.method === "GET" && pathname === "/api/calls") return sendJson(res, 200, { calls });

    if (req.method === "GET" && pathname === "/api/orders/stream") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "hello", orders: orders.length })}\n\n`);
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    // Parse free text into a draft (no order created). Optional Claude assist.
    if (req.method === "POST" && pathname === "/api/parse") {
      const body = await readBody(req);
      let parsed = parseOrderText(String(body.text || ""), menu);
      let usedClaude = false;
      if (claudeAvailable() && body.useClaude !== false) {
        try {
          const claudeLines = await parseWithClaude(String(body.text || ""), menu);
          const { lines, errors } = validateLines(claudeLines, menu);
          if (lines.length > 0) { parsed = { lines, unknown: [], errors }; usedClaude = true; }
        } catch (e) { parsed.errors.push(`claude assist failed, used deterministic parser: ${e.message}`); }
      }
      const total = computeTotal(parsed.lines);
      return sendJson(res, 200, {
        lines: parsed.lines.map(({ dish, qty }) => ({ dishId: dish.id, nameEn: dish.nameEn, nameZh: dish.nameZh, price: dish.price, qty })),
        unknown: parsed.unknown, errors: parsed.errors, total, usedClaude,
        readback: parsed.lines.length ? formatReadback(parsed.lines, total) : "",
      });
    }

    // Create an order — only after the caller confirms (confirmed: true).
    if (req.method === "POST" && pathname === "/api/orders") {
      const body = await readBody(req);
      if (body.confirmed !== true) return sendJson(res, 400, { error: "order requires explicit confirmation (confirmed: true)" });
      const { lines, errors } = validateLines(body.items || [], menu);
      if (errors.length) return sendJson(res, 400, { error: "invalid order", details: errors });
      const number = nextOrderNumber(lastOrderNumber);
      lastOrderNumber = number;
      const order = {
        id: `DLD-${number}`,
        number,
        items: lines.map(({ dish, qty }) => ({ dishId: dish.id, nameEn: dish.nameEn, nameZh: dish.nameZh, price: dish.price, qty })),
        total: computeTotal(lines),
        status: "new",
        channel: body.channel || "web-phone",
        customerName: body.customerName || "Phone caller",
        transcript: body.transcript || "",
        etaMinutes: menuData.restaurant.etaMinutes,
        createdAt: new Date().toISOString(),
      };
      orders.unshift(order);
      if (body.transcript) calls.unshift({ id: order.id, transcript: body.transcript, orderNumber: number, createdAt: order.createdAt });
      const ticketFile = await writeTicket(order);
      await persist();
      broadcast({ type: "new-order", order });
      return sendJson(res, 201, { order, ticketFile: path.basename(ticketFile), readback: formatReadback(lines, order.total) });
    }

    const statusMatch = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
    if (req.method === "PATCH" && statusMatch) {
      const body = await readBody(req);
      const order = orders.find((o) => o.id === decodeURIComponent(statusMatch[1]));
      if (!order) return sendJson(res, 404, { error: "order not found" });
      if (!["new", "cooking", "ready"].includes(body.status)) return sendJson(res, 400, { error: "invalid status" });
      order.status = body.status;
      await persist();
      broadcast({ type: "status", order });
      return sendJson(res, 200, { order });
    }

    const menuPatch = pathname.match(/^\/api\/menu\/([^/]+)$/);
    if (req.method === "PATCH" && menuPatch) {
      const body = await readBody(req);
      const dish = menu.find((d) => d.id === decodeURIComponent(menuPatch[1]));
      if (!dish) return sendJson(res, 404, { error: "dish not found" });
      if (typeof body.outOfStock === "boolean") dish.outOfStock = body.outOfStock;
      if (typeof body.price === "number" && body.price > 0) dish.price = Math.round(body.price * 100) / 100;
      await fs.writeFile(path.join(DATA_DIR, "menu.json"), JSON.stringify(menuData, null, 2));
      broadcast({ type: "menu", dishes: menu });
      return sendJson(res, 200, { dish });
    }

    return sendJson(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    return sendJson(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`Dead Line Diner running at http://localhost:${PORT}`);
  console.log(`Claude assist: ${claudeAvailable() ? "enabled (key set)" : "OFF — deterministic parser only (set ANTHROPIC_API_KEY to enable)"}`);
});
