import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  console.error(`[build-check] ${message}`);
  process.exit(1);
}

function collectFiles(dir, extension) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [fullPath] : [];
  });
}

const prerenderManifest = readJson(".next/prerender-manifest.json");
const appPathsManifest = readJson(".next/server/app-paths-manifest.json");
const loginSource = readFileSync("app/login/route.ts", "utf8");
const loginBundle = readFileSync(".next/server/app/login/route.js", "utf8");
const proxyBundle = [
  readFileSync(".next/server/middleware.js", "utf8"),
  ...collectFiles(".next/server/chunks", ".js").map((file) => readFileSync(file, "utf8"))
].join("\n");
const proxySource = readFileSync("proxy.ts", "utf8");
const nginxConfig = readFileSync("deploy/nginx/tvacollect.conf", "utf8");
const composeProd = existsSync("docker-compose.prod.yml") ? readFileSync("docker-compose.prod.yml", "utf8") : null;

if (prerenderManifest.routes?.["/login"]) {
  fail("/login is present in the prerender manifest. It must stay dynamic to avoid cached self-redirects.");
}

if (appPathsManifest["/login/route"] !== "app/login/route.js") {
  fail("/login/route does not point to the expected app/login/route.js bundle.");
}

if (!loginSource.includes('export const dynamic = "force-dynamic"')) {
  fail("/login route source does not contain the force-dynamic marker.");
}

if (!loginSource.includes('id="login-form"') && !loginBundle.includes("login-form")) {
  fail("/login route does not contain the login form marker.");
}

const cssFiles = collectFiles(".next/static", ".css");
if (cssFiles.length === 0) {
  fail("Next build produced no CSS files under .next/static.");
}

const cssBundle = cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");
for (const marker of [".app-shell", ".btn-primary", ".card", ".data-table"]) {
  if (!cssBundle.includes(marker)) {
    fail(`Compiled CSS bundle is missing design-system marker: ${marker}`);
  }
}

const indexHtml = readFileSync(".next/server/app/index.html", "utf8");
if (!indexHtml.includes("/_next/static/") || !indexHtml.includes(".css")) {
  fail("Public home HTML does not reference a Next CSS asset.");
}

if (!proxySource.includes('matcher: ["/((?!_next/static|_next/image|.*\\\\..*).*)"]')) {
  fail("Proxy matcher must support host-based routing for public, app, and admin domains.");
}

for (const marker of [
  "isAppHost(host)",
  "isAdminHost(host)",
  "isPublicHost(host)",
  'headers.set("x-route-zone", zone)',
  'headers.set("x-visible-base", visibleBase)',
  "withBase(appInternalBase, pathname)",
  "withBase(adminInternalBase, pathname)"
]) {
  if (!proxySource.includes(marker)) {
    fail(`Proxy source is missing host-routing marker: ${marker}`);
  }
}

for (const marker of ["x-route-zone", "x-visible-base", "app.tvacollect.com", "admin.tvacollect.com"]) {
  if (!proxyBundle.includes(marker)) {
    fail(`Compiled proxy bundle is missing host-routing marker: ${marker}`);
  }
}

for (const marker of ["server_name tvacollect.com www.tvacollect.com app.tvacollect.com admin.tvacollect.com", "location /_next/static/", "proxy_pass http://tvacollect_app"]) {
  if (!nginxConfig.includes(marker)) {
    fail(`Nginx config is missing production routing/static marker: ${marker}`);
  }
}

if (nginxConfig.includes("return 301 https://app.tvacollect.com")) {
  fail("Nginx must not redirect the public website to app.tvacollect.com.");
}

if (composeProd) {
  if (!composeProd.includes("-d admin.tvacollect.com")) {
    fail("Certbot production command must include admin.tvacollect.com.");
  }
} else {
  console.warn("[build-check] docker-compose.prod.yml not present in Docker build context; skipping compose-only certbot assertion.");
}

console.log("[build-check] /login dynamic, CSS compiled, and public/app/admin host routing is configured.");
