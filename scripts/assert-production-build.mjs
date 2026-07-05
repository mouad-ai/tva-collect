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

if (prerenderManifest.routes?.["/login"]) {
  fail("/login is present in the prerender manifest. It must stay dynamic to avoid cached self-redirects.");
}

if (appPathsManifest["/login/page"] !== "app/login/page.js") {
  fail("/login/page does not point to the expected app/login/page.js bundle.");
}

if (!loginBundle.includes("force-dynamic")) {
  fail("/login bundle does not contain the force-dynamic marker.");
}

if (!loginBundle.includes("LoginStatusMessages")) {
  fail("/login bundle does not contain the client status message component.");
}

console.log("[build-check] /login is dynamic and compiled from the expected bundle.");
