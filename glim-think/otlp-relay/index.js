/**
 * Phoenix OTLP egress relay (Cloud Run).
 *
 * Why this exists: app.phoenix.arize.com is Cloudflare-fronted, and Cloudflare
 * short-circuits Cloudflare-Worker → Cloudflare-zone subrequests at the edge,
 * returning a deceptive OTLP-success-shaped `200` while black-holing the
 * spans (proven 2026-05-16 — see ../OBSERVABILITY.md). A request from GCP's
 * network reaches Phoenix's real origin and ingests normally.
 *
 * This service receives the Worker's OTLP protobuf, authenticates it with a
 * shared token (so it is not an open proxy), and forwards it to Phoenix Cloud
 * with the Bearer key + the WAF-allowed OTLP User-Agent. It is intentionally
 * dependency-free: Node's built-in http + global fetch only.
 */

import { createServer } from "node:http";

const PORT = process.env.PORT || 8080;
const PHOENIX_OTLP_URL = process.env.PHOENIX_OTLP_URL; // .../s/<space>/v1/traces
const PHOENIX_API_KEY = process.env.PHOENIX_API_KEY;
const RELAY_TOKEN = process.env.RELAY_TOKEN;
// Phoenix Cloud's WAF blocks custom/product User-Agents (e.g. "glim-think/*")
// with a 302→/login. The standard OTLP exporter UA is allowed and accurate.
const FORWARD_UA = "OTel-OTLP-Exporter-JavaScript/0.200.0";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "text/plain", ...headers });
    res.end(body);
  };

  if (req.method === "GET" && req.url === "/healthz") {
    return send(200, "ok");
  }

  if (req.method !== "POST" || !req.url.startsWith("/v1/traces")) {
    return send(404, "not found");
  }

  if (!PHOENIX_OTLP_URL || !PHOENIX_API_KEY || !RELAY_TOKEN) {
    return send(500, "relay misconfigured (missing env)");
  }

  // Shared-secret auth — reject anything without the Worker's relay token.
  if (req.headers["x-relay-token"] !== RELAY_TOKEN) {
    return send(401, "unauthorized");
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(400, "failed to read body");
  }
  if (body.length === 0) {
    return send(400, "empty body");
  }

  try {
    const upstream = await fetch(PHOENIX_OTLP_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-protobuf",
        accept: "application/x-protobuf",
        "user-agent": FORWARD_UA,
        Authorization: `Bearer ${PHOENIX_API_KEY}`,
      },
      body,
      redirect: "manual",
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    // Surface the true upstream result (incl. 3xx) so the Worker exporter's
    // hardened error path can react instead of silently "succeeding".
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/octet-stream",
      "x-phoenix-upstream-status": String(upstream.status),
    });
    res.end(buf);
  } catch (e) {
    send(502, `relay upstream error: ${String(e)}`);
  }
});

server.listen(PORT, () => {
  console.log(`[otlp-relay] listening on :${PORT} → ${PHOENIX_OTLP_URL ? "configured" : "MISSING PHOENIX_OTLP_URL"}`);
});
