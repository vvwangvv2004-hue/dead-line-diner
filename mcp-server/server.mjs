// mcp-server/server.mjs — MCP stub for Dead Line Diner.
// Minimal JSON-RPC over stdio implementing the MCP handshake well enough for
// Kiro to list and call tools. It shares the SAME deterministic order logic
// and the SAME menu file as the HTTP server, so the menu stays the single
// source of truth in every path.
//
// Run:  npm run mcp        (or: node mcp-server/server.mjs)
// Smoke test:
//   printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
//     '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
//     '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_menu","arguments":{}}}' \
//     | node mcp-server/server.mjs
//
// Tools:
//   get_menu     — full menu (id, names, price, allergens, outOfStock)
//   lookup_dish  — find a dish by name/alias, or report it as unknown
//   create_order — validate lines and create an order (requires confirmed:true)
//                  Orders created here are kept in this process only; the
//                  HTTP server is the kitchen's live store. For the demo,
//                  the HTTP /api/orders endpoint is the canonical path.

import { readFileSync } from "node:fs";
import { computeTotal, nextOrderNumber, parseOrderText, validateLines } from "../server/orderLogic.mjs";

const menu = JSON.parse(readFileSync(new URL("../data/menu.json", import.meta.url), "utf8")).dishes;
let lastOrderNumber = 1000;
const orders = [];

const TOOLS = [
  { name: "get_menu", description: "List the full Dead Line Diner menu with prices, allergens and stock flags.", inputSchema: { type: "object", properties: {} } },
  { name: "lookup_dish", description: "Look up one dish by name or alias. Returns the dish, or unknown:true if it is not on the menu.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "create_order", description: "Create an order from validated menu lines. Requires confirmed:true. Never invents dishes or prices.", inputSchema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { dishId: { type: "string" }, qty: { type: "integer" } } } }, confirmed: { type: "boolean" }, transcript: { type: "string" } }, required: ["items", "confirmed"] } },
];

function result(id, resultObj) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: resultObj }) + "\n");
}
function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}
function text(content) {
  return { content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }] };
}

function callTool(name, args = {}) {
  if (name === "get_menu") return text({ dishes: menu });
  if (name === "lookup_dish") {
    const { lines, unknown } = parseOrderText(String(args.query || ""), menu);
    if (lines.length) return text({ dish: lines[0].dish, qty: lines[0].qty });
    return text({ unknown: true, query: args.query, note: "Not on the menu — do not order it." });
  }
  if (name === "create_order") {
    if (args.confirmed !== true) throw new Error("order requires explicit confirmation (confirmed: true)");
    const { lines, errors } = validateLines(args.items || [], menu);
    if (errors.length) throw new Error(`invalid order: ${errors.join("; ")}`);
    const number = nextOrderNumber(lastOrderNumber);
    lastOrderNumber = number;
    const order = {
      id: `DLD-${number}`, number,
      items: lines.map(({ dish, qty }) => ({ dishId: dish.id, nameEn: dish.nameEn, price: dish.price, qty })),
      total: computeTotal(lines), status: "new",
      transcript: args.transcript || "", createdAt: new Date().toISOString(),
    };
    orders.push(order);
    return text({ order });
  }
  throw new Error(`unknown tool: ${name}`);
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const { id, method, params } = msg;
    try {
      if (method === "initialize") {
        result(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "dead-line-diner-mcp", version: "0.1.0" } });
      } else if (method === "tools/list") {
        result(id, { tools: TOOLS });
      } else if (method === "tools/call") {
        result(id, callTool(params?.name, params?.arguments || {}));
      } else if (method === "notifications/initialized" || method === "ping") {
        if (id !== undefined) result(id, {});
      } else {
        if (id !== undefined) error(id, -32601, `method not found: ${method}`);
      }
    } catch (e) {
      if (id !== undefined) error(id, -32603, String(e.message || e));
    }
  }
});
