// Serves the comic page.
// On this computer it also forwards /api to the matching server and the core server.
// On Vercel, vercel.json sends /api to those services before this server sees it.

const express = require("express");
const path = require("path");

const app = express();
const backendOrigin = process.env.MATCHING_API_URL || "http://127.0.0.1:3001";
const coreOrigin = process.env.CORE_API_URL || "http://127.0.0.1:3002";

function isCorePath(requestPath) {
  if (requestPath.startsWith("/api/messages")) return true;
  if (requestPath.startsWith("/api/locations")) return true;
  if (requestPath.startsWith("/api/check-in")) return true;
  if (requestPath.startsWith("/api/teams")) return true;
  if (/^\/api\/matches\/[^/]+\/messages/.test(requestPath)) return true;
  if (/^\/api\/users\/[^/]+\/locations/.test(requestPath)) return true;
  if (/^\/api\/users\/[^/]+\/check-in/.test(requestPath)) return true;
  if (/^\/api\/users\/[^/]+\/teams/.test(requestPath)) return true;
  return false;
}

app.use("/api", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  const requestPath = req.originalUrl.split("?")[0];
  const origin = isCorePath(requestPath) ? coreOrigin : backendOrigin;
  const payload = req.body && req.body.length ? req.body : undefined;
  try {
    const response = await fetch(new URL(req.originalUrl, origin), {
      method: req.method,
      headers: payload ? { "content-type": req.headers["content-type"] || "application/json" } : {},
      body: payload
    });
    const text = await response.text();
    res.status(response.status);
    res.type(response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    res.status(503).json({ error: "The server is not running." });
  }
});

app.use(express.static(__dirname, { index: "index.html" }));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Comic page on http://localhost:${port}`);
  });
}

module.exports = app;
