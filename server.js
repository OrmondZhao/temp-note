const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const port = Number(process.env.PORT || 3173);
const exportsDir = path.join(rootDir, "exports");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function safeFilePart(value, fallback) {
  const text = String(value || "").trim();
  const cleaned = text.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 64);
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === "POST" && pathname === "/api/export") {
    readJsonBody(req)
      .then((payload) => {
        if (!payload || typeof payload !== "object" || !payload.note) {
          send(res, 400, JSON.stringify({ ok: false, error: "Invalid payload" }), {
            "Content-Type": "application/json; charset=utf-8",
          });
          return;
        }

        const note = payload.note;
        const title = safeFilePart(note.title, "untitled");
        const fileName = title + ".json";
        const filePath = path.join(exportsDir, fileName);
        const data = JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            note,
          },
          null,
          2,
        );

        fs.writeFile(filePath, data, "utf8", (error) => {
          if (error) {
            send(res, 500, JSON.stringify({ ok: false, error: error.message }), {
              "Content-Type": "application/json; charset=utf-8",
            });
            return;
          }

          send(
            res,
            200,
            JSON.stringify({
              ok: true,
              fileName: fileName,
              fileUrl: `/exports/${encodeURIComponent(fileName)}`,
            }),
            {
              "Content-Type": "application/json; charset=utf-8",
            },
          );
        });
      })
      .catch((error) => {
        send(res, 400, JSON.stringify({ ok: false, error: error.message }), {
          "Content-Type": "application/json; charset=utf-8",
        });
      });
    return;
  }

  if (pathname === "/" || pathname === "") {
    serveFile(path.join(publicDir, "index.html"), res);
    return;
  }

  if (pathname === "/en" || pathname === "/en/") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  const publicPath = path.normalize(path.join(publicDir, pathname));
  if (publicPath.startsWith(publicDir) && fs.existsSync(publicPath)) {
    serveFile(publicPath, res);
    return;
  }

  const filePath = path.normalize(path.join(rootDir, pathname));
  if (!filePath.startsWith(rootDir)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      send(res, 404, "Not found");
      return;
    }

    serveFile(filePath, res);
  });
});

server.listen(port, () => {
  console.log(`Local site ready: http://localhost:${port}`);
});
