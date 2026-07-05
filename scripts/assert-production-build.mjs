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
const loginBundle = readFileSync(".next/server/app/login/page.js", "utf8");

if (!prerenderManifest.routes?.["/login"]) {
  fail("/login is not present in the prerender manifest. It would be served dynamically in production.");
}

if (appPathsManifest["/login/page"] !== "app/login/page.js") {
  fail("/login/page does not point to the expected app/login/page.js bundle.");
}

if (!loginBundle.includes("force-static")) {
  fail("/login bundle does not contain the force-static marker.");
}

if (!loginBundle.includes("LoginStatusMessages")) {
  fail("/login bundle does not contain the client status message component.");
}

console.log("[build-check] /login is static and compiled from the expected bundle.");
