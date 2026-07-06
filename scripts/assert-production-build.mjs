import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  console.error(`[build-check] ${message}`);
  process.exit(1);
}

const prerenderManifest = readJson(".next/prerender-manifest.json");
const appPathsManifest = readJson(".next/server/app-paths-manifest.json");
const loginBundle = readFileSync(".next/server/app/login/route.js", "utf8");
const proxyBundle = readFileSync(".next/server/middleware.js", "utf8");
const proxySource = readFileSync("proxy.ts", "utf8");
const nginxConfig = readFileSync("deploy/nginx/tvacollect.conf", "utf8");
const composeProd = readFileSync("docker-compose.prod.yml", "utf8");

if (prerenderManifest.routes?.["/login"]) {
  fail("/login is present in the prerender manifest. It must stay dynamic to avoid cached self-redirects.");
}

if (appPathsManifest["/login/route"] !== "app/login/route.js") {
  fail("/login/route does not point to the expected app/login/route.js bundle.");
}

if (!loginBundle.includes("force-dynamic")) {
  fail("/login bundle does not contain the force-dynamic marker.");
}

if (!loginBundle.includes("login-form")) {
  fail("/login route bundle does not contain the login form marker.");
}

const cssDir = ".next/static/css";
if (!existsSync(cssDir)) {
  fail("Next CSS output directory is missing: .next/static/css");
}

const cssFiles = readdirSync(cssDir).filter((file) => file.endsWith(".css"));
if (cssFiles.length === 0) {
  fail("Next build produced no CSS files under .next/static/css.");
}

const cssBundle = cssFiles.map((file) => readFileSync(join(cssDir, file), "utf8")).join("\n");
for (const marker of [".app-shell", ".btn-primary", ".card", ".data-table"]) {
  if (!cssBundle.includes(marker)) {
    fail(`Compiled CSS bundle is missing design-system marker: ${marker}`);
  }
}

const indexHtml = readFileSync(".next/server/app/index.html", "utf8");
if (!indexHtml.includes("/_next/static/css/")) {
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

if (!composeProd.includes("-d admin.tvacollect.com")) {
  fail("Certbot production command must include admin.tvacollect.com.");
}

console.log("[build-check] /login dynamic, CSS compiled, and public/app/admin host routing is configured.");
