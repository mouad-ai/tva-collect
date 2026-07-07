import assert from "node:assert/strict";
import test from "node:test";
import { cleanDestinationForRequest, externalUrlForRequest, hrefForBase, stripBase, withBase } from "../lib/routing";

test("routing helpers strip and apply internal app/admin bases", () => {
  assert.equal(stripBase("/app", "/app"), "/");
  assert.equal(stripBase("/app/clients", "/app"), "/clients");
  assert.equal(stripBase("/admin/firms", "/admin"), "/firms");
  assert.equal(withBase("/app", "/clients"), "/app/clients");
  assert.equal(withBase("/admin", "/"), "/admin");
});

test("hrefForBase creates clean host links and local path-mode links", () => {
  assert.equal(hrefForBase("", "/clients"), "/clients");
  assert.equal(hrefForBase("", "/"), "/");
  assert.equal(hrefForBase("/app", "/clients"), "/app/clients");
  assert.equal(hrefForBase("/admin", "/firms"), "/admin/firms");
});

test("post-login destinations are clean on app/admin hosts and path-based on localhost", () => {
  assert.equal(cleanDestinationForRequest("https://app.tvacollect.com/login", "/app"), "/");
  assert.equal(cleanDestinationForRequest("https://app.tvacollect.com/login", "/app/clients"), "/clients");
  assert.equal(cleanDestinationForRequest("https://admin.tvacollect.com/login", "/admin"), "/");
  assert.equal(cleanDestinationForRequest("https://admin.tvacollect.com/login", "/admin/firms"), "/firms");
  assert.equal(cleanDestinationForRequest("https://admin.tvacollect.com:3000/login", "/app"), "https://app.tvacollect.com/");
  assert.equal(cleanDestinationForRequest("https://app.tvacollect.com:3000/login", "/admin"), "https://admin.tvacollect.com/");
  assert.equal(cleanDestinationForRequest("http://localhost:3000/login", "/app"), "/app");
  assert.equal(cleanDestinationForRequest("http://localhost:3000/login", "/admin"), "/admin");
});

test("externalUrlForRequest prefers forwarded production host over internal proxy origin", () => {
  const request = new Request("https://localhost:3000/api/auth/logout", {
    headers: {
      host: "localhost:3000",
      "x-forwarded-host": "admin.tvacollect.com",
      "x-forwarded-proto": "https"
    }
  });

  assert.equal(externalUrlForRequest(request, "/login").toString(), "https://admin.tvacollect.com/login");
});
