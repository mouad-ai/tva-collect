import assert from "node:assert/strict";
import test from "node:test";
import { usagePercent } from "../lib/billing";

test("usagePercent caps at 100 and handles unlimited plans", () => {
  assert.equal(usagePercent(15, 30), 50);
  assert.equal(usagePercent(40, 30), 100);
  assert.equal(usagePercent(10, null), 0);
});
