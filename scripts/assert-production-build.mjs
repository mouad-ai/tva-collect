import { readFileSync } from "node:fs";

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

console.log("[build-check] /login is dynamic and proxy supports public/app/admin host routing.");
