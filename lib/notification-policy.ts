export function isNotificationUnread(occurredAt: Date, lastSeenAt: Date | null | undefined) {
  return !lastSeenAt || occurredAt > lastSeenAt;
}

export function unreadNotificationCount(events: Array<{ occurredAt: Date }>, lastSeenAt: Date | null | undefined) {
  return events.filter((event) => isNotificationUnread(event.occurredAt, lastSeenAt)).length;
}
