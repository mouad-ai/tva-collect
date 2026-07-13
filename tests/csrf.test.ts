import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "../lib/csrf";

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("https://app.tvacollect.com/api/clients", { method: "POST", headers });
}

test("isSameOriginRequest accepts a same-origin Origin header", () => {
  const request = requestWithHeaders({ origin: "https://app.tvacollect.com", host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(request), true);
});

test("isSameOriginRequest rejects a cross-origin Origin header", () => {
  const request = requestWithHeaders({ origin: "https://attacker.example", host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(request), false);
});

test("isSameOriginRequest falls back to Referer when Origin is absent", () => {
  const sameOrigin = requestWithHeaders({ referer: "https://app.tvacollect.com/app/clients", host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(sameOrigin), true);

  const crossOrigin = requestWithHeaders({ referer: "https://attacker.example/evil", host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(crossOrigin), false);
});

test("isSameOriginRequest respects X-Forwarded-Host behind a reverse proxy", () => {
  const request = requestWithHeaders({
    origin: "https://app.tvacollect.com",
    host: "127.0.0.1:3000",
    "x-forwarded-host": "app.tvacollect.com"
  });
  assert.equal(isSameOriginRequest(request), true);
});

test("isSameOriginRequest rejects requests with neither Origin nor Referer", () => {
  const request = requestWithHeaders({ host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(request), false);
});

test("isSameOriginRequest rejects a malformed Origin header instead of throwing", () => {
  const request = requestWithHeaders({ origin: "not-a-url", host: "app.tvacollect.com" });
  assert.equal(isSameOriginRequest(request), false);
});
