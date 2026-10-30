// Local preview of dist/ that behaves like production: precompressed .br/.gz, cache headers, 404.html.
// Usage: npm run serve  [-- --port 8080]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const i = process.argv.indexOf("--port");
const port = Number(i > -1 ? process.argv[i + 1] : process.env.PORT || 8080);
if (!fs.existsSync(path.join(dist, "index.html"))) { console.error("dist/ is empty: run npm run build first"); process.exit(1); }
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".json": "application/json" };

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  let file = path.join(dist, path.normalize(rel));
  let status = 200;
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory() || path.basename(file).startsWith("_")) { file = path.join(dist, "404.html"); status = 404; }
  const ext = path.extname(file);
  const headers = { "Content-Type": types[ext] || "application/octet-stream", "Vary": "Accept-Encoding", "X-Content-Type-Options": "nosniff" };
  headers["Cache-Control"] = ext === ".html" ? "no-cache" : url.searchParams.has("v") ? "public, max-age=31536000, immutable" : /\.(png|jpg|svg)$/.test(ext) ? "public, max-age=604800" : "public, max-age=3600";
  const ae = req.headers["accept-encoding"] || "";
  for (const [enc, suf] of [["br", ".br"], ["gzip", ".gz"]]) if (ae.includes(enc) && fs.existsSync(file + suf)) { file += suf; headers["Content-Encoding"] = enc; break; }
  res.writeHead(status, headers);
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
