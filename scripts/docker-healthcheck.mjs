const baseUrl = process.env.HEALTHCHECK_BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { path: "/api/health", status: 200 },
  { path: "/", status: 200 },
  { path: "/login", status: 200 },
  { path: "/forgot-password", status: 200 },
  { path: "/admin", status: 307, location: "/login" },
  { path: "/app", status: 307, location: "/login" },
  { path: "/api/auth/me", status: 401 }
];

function normalizeLocation(location) {
  if (!location) return null;
  try {
    const parsed = new URL(location, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return location;
  }
}

async function checkRoute({ path, status, location }) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (response.status !== status) {
    throw new Error(`${path} returned ${response.status}, expected ${status}`);
  }

  if (location) {
    const actual = normalizeLocation(response.headers.get("location"));
    if (actual !== location) {
      throw new Error(`${path} redirected to ${actual || "null"}, expected ${location}`);
    }
  }
}

async function main() {
  for (const check of checks) {
    await checkRoute(check);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(`[healthcheck] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
