import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./loadenv.js";
import { setCommands, setWebhook } from "./bot.js";
import { handleWebRequest } from "./handler.js";

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return true;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function incomingToWebRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  return new Request(`http://127.0.0.1${req.url}`, {
    method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, "http://localhost").pathname;
    if (p.startsWith("/api") || p === "/webhook") {
      const request = await incomingToWebRequest(req);
      const response = await handleWebRequest(request);
      const body = Buffer.from(await response.arrayBuffer());
      const headers = Object.fromEntries(response.headers.entries());
      res.writeHead(response.status, headers);
      res.end(body);
      return;
    }
    if (req.method === "GET" && serveStatic(req, res)) return;
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "server" }));
  }
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`NuCalorie Mini App: http://localhost:${PORT}`);
  if (BOT_TOKEN && PUBLIC_URL.startsWith("https://")) {
    await setCommands(BOT_TOKEN);
    const wh = await setWebhook(BOT_TOKEN, PUBLIC_URL, process.env.WEBHOOK_SECRET || "dev-secret");
    console.log("Webhook:", wh);
  } else {
    console.log("Bot webhook skipped (need BOT_TOKEN + https PUBLIC_URL). Mini App still works in the browser.");
  }
});
