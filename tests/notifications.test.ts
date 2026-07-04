import assert from "node:assert/strict";
import test from "node:test";
import { isNotificationUnread, unreadNotificationCount } from "../lib/notification-policy";

test("notifications are unread only when newer than the last seen timestamp", () => {
  const lastSeenAt = new Date("2026-07-01T12:00:00.000Z");

  assert.equal(isNotificationUnread(new Date("2026-07-01T12:00:01.000Z"), lastSeenAt), true);
  assert.equal(isNotificationUnread(new Date("2026-07-01T12:00:00.000Z"), lastSeenAt), false);
  assert.equal(isNotificationUnread(new Date("2026-07-01T11:59:59.000Z"), lastSeenAt), false);
});

test("notification unread counter resets after all displayed events are marked seen", () => {
  const events = [
    { occurredAt: new Date("2026-07-01T11:55:00.000Z") },
    { occurredAt: new Date("2026-07-01T12:05:00.000Z") },
    { occurredAt: new Date("2026-07-01T12:06:00.000Z") }
  ];

  assert.equal(unreadNotificationCount(events, new Date("2026-07-01T12:00:00.000Z")), 2);
  assert.equal(unreadNotificationCount(events, new Date("2026-07-01T12:06:00.000Z")), 0);
});
