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

if (!proxyBundle.includes('matcher:["/app","/app/:path*","/admin","/admin/:path*"]')) {
  fail("Proxy matcher must only target /app and /admin paths.");
}

if (proxyBundle.includes("/forgot-password") || proxyBundle.includes('pathname === "/"')) {
  fail("Proxy bundle must not contain public-route redirect logic.");
}

console.log("[build-check] /login is a dynamic route handler and compiled from the expected bundle.");
