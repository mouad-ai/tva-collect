import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneDigits, phoneMatchSuffix, stageForIntent } from "../lib/sales-ai";

test("normalizePhoneDigits strips everything but digits", () => {
  assert.equal(normalizePhoneDigits("+212 6-12.34/56.78"), "212612345678");
  assert.equal(normalizePhoneDigits("0612345678"), "0612345678");
  assert.equal(normalizePhoneDigits(""), "");
});

test("phoneMatchSuffix reconciles differing country-code formats to the same key", () => {
  const internationalFormat = phoneMatchSuffix("+212612345678");
  const localFormat = phoneMatchSuffix("0612345678");
  const whatsappJidStyle = phoneMatchSuffix("212612345678");

  assert.equal(internationalFormat, "612345678");
  assert.equal(localFormat, "612345678");
  assert.equal(whatsappJidStyle, "612345678");
});

test("phoneMatchSuffix returns fewer than 9 digits for short input instead of throwing", () => {
  assert.equal(phoneMatchSuffix("123"), "123");
});

test("phoneMatchSuffix matches even when the stored number has separators inside the last 9 digits", () => {
  // Regression guard: this is exactly why the inbound-reply lookup can't use
  // a DB-level `contains` — Google Places numbers come formatted like this,
  // and the plain digit string is not a literal substring of it.
  const asStoredByGooglePlaces = phoneMatchSuffix("+212 522-123456");
  const asSentByWhatsapp = phoneMatchSuffix("212522123456");
  assert.equal(asStoredByGooglePlaces, asSentByWhatsapp);
  assert.equal(asStoredByGooglePlaces, "522123456");
});

test("stageForIntent maps every known intent to a pipeline stage that actually exists in lib/sales.ts's leadStages", () => {
  assert.equal(stageForIntent("wants_pilot", "NEW"), "PILOT_PROPOSED");
  assert.equal(stageForIntent("not_interested", "NEW"), "LOST");
  assert.equal(stageForIntent("interested", "NEW"), "CONTACTED");
  assert.equal(stageForIntent("price_question", "NEW"), "CONTACTED");
  assert.equal(stageForIntent("needs_human", "NEW"), "CONTACTED");
  assert.equal(stageForIntent("other", "NEW"), "CONTACTED");
});

test("stageForIntent falls back to the lead's current stage for an unrecognized intent", () => {
  assert.equal(stageForIntent("something_unexpected", "CONTACTED"), "CONTACTED");
  assert.equal(stageForIntent("", "PILOT_PROPOSED"), "PILOT_PROPOSED");
});

test("stageForIntent's outputs are all valid values from lib/sales.ts's leadStages", () => {
  const validStages = new Set(["NEW", "CONTACTED", "QUALIFIED", "DEMO_SCHEDULED", "DEMO_DONE", "PILOT_PROPOSED", "PILOT_ACTIVE", "WON", "LOST", "NURTURE"]);
  const intents = ["interested", "price_question", "wants_pilot", "not_interested", "needs_human", "other"];
  for (const intent of intents) {
    assert.ok(validStages.has(stageForIntent(intent, "NEW")), `${intent} must map to a real lead stage`);
  }
});
