import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const MIME = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

function resolveRequestPath(requestUrl = "/") {
  const url = new URL(requestUrl, `http://${HOST}:${PORT}`);
  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = resolve(ROOT, normalize(relative));

  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) {
    return null;
  }

  return candidate;
}

const server = createServer((req, res) => {
  const pathname = resolveRequestPath(req.url);

  if (!pathname) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  let file = pathname;

  try {
    const stat = statSync(file);
    if (stat.isDirectory()) file = join(file, "index.html");
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  try {
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error("not-file");
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const contentType = MIME.get(extname(file).toLowerCase()) || "application/octet-stream";

  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  });

  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("FlightFlow ATS local server");
  console.log(`http://${HOST}:${PORT}`);
  console.log("");
  console.log("Press Ctrl+C to stop.");
});
