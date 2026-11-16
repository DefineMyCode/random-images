const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const port = Number(process.env.PORT) || 3000;
const startedAt = new Date().toISOString();
const PAGE_MAX = 85;
const ID_PATTERN = /^\d{1,9}$/;

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  res.end(payload);
}

function readId(url) {
  const id = url.searchParams.get("id") || "";
  return ID_PATTERN.test(id) ? id : null;
}

async function loadBatch(count) {
  let lastError = new Error("no attempt made");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const page = 1 + Math.floor(Math.random() * PAGE_MAX);
    try {
      const response = await fetch(
        "https://picsum.photos/v2/list?page=" + page + "&limit=" + count,
        {
          headers: { "user-agent": "picsum-random-viewer/1.1" },
          signal: AbortSignal.timeout(9000),
        }
      );
      if (!response.ok) throw new Error("picsum responded " + response.status);
      const list = await response.json();
      if (Array.isArray(list) && list.length > 0) {
        return {
          page,
          images: list.map((pic) => ({
            id: pic.id,
            author: pic.author,
            width: pic.width,
            height: pic.height,
            link: pic.url,
          })),
        };
      }
      lastError = new Error("empty batch on page " + page);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function loadPhoto(id) {
  const response = await fetch("https://picsum.photos/id/" + id + "/info", {
    headers: { "user-agent": "picsum-random-viewer/1.1" },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error("picsum responded " + response.status);
  const info = await response.json();
  return {
    id: info.id,
    author: info.author,
    width: info.width,
    height: info.height,
    link: info.url,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/images") {
    const requested = Number(url.searchParams.get("count")) || 12;
    const count = Math.min(Math.max(requested, 4), 30);
    try {
      json(res, 200, await loadBatch(count));
    } catch (error) {
      json(res, 502, {
        error: "upstream_failed",
        detail: String((error && error.message) || error),
      });
    }
    return;
  }

  if (url.pathname === "/api/photo") {
    const id = readId(url);
    if (!id) {
      json(res, 400, { error: "bad_id" });
      return;
    }
    try {
      json(res, 200, await loadPhoto(id));
    } catch (error) {
      json(res, 502, {
        error: "upstream_failed",
        detail: String((error && error.message) || error),
      });
    }
    return;
  }

  if (url.pathname === "/api/download") {
    const id = readId(url);
    if (!id) {
      json(res, 400, { error: "bad_id" });
      return;
    }
    try {
      const upstream = await fetch("https://picsum.photos/id/" + id + "/1600/1000", {
        headers: { "user-agent": "picsum-random-viewer/1.1" },
        signal: AbortSignal.timeout(20000),
      });
      if (!upstream.ok || !upstream.body) {
        throw new Error("picsum responded " + upstream.status);
      }
      res.writeHead(200, {
        "content-type": upstream.headers.get("content-type") || "image/jpeg",
        "content-disposition": 'attachment; filename="picsum-' + id + '.jpg"',
        "cache-control": "public, max-age=86400",
      });
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      json(res, 502, {
        error: "upstream_failed",
        detail: String((error && error.message) || error),
      });
    }
    return;
  }

  if (url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      node: process.version,
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    });
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = fs
      .readFileSync(path.join(__dirname, "index.html"), "utf8")
      .replaceAll("{{STARTED_AT}}", startedAt)
      .replaceAll("{{NODE}}", process.version);
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(html);
    return;
  }

  json(res, 404, { ok: false, error: "not_found", path: url.pathname });
});

server.listen(port, () => {
  console.log("listening on " + port);
});