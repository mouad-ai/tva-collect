// Pure helpers for the AI sales pipeline (trigger/handle-inbound-reply.ts and
// friends). Kept separate from the Trigger.dev task files — which import
// Prisma and other side-effecting modules at the top level — so this logic
// can be unit tested directly, matching the rest of this codebase's
// lib/*.ts convention.

export function normalizePhoneDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

// WhatsApp JIDs, Google Places numbers, and manually-typed phone numbers
// disagree on country-code formatting ("+212...", "0...", "212..."). Matching
// on the last 9 digits (a Moroccan local number's length) is the reliable
// common denominator between all three sources.
export function phoneMatchSuffix(value: string) {
  const digits = normalizePhoneDigits(value);
  return digits.slice(-9);
}

export type LeadIntent = "interested" | "price_question" | "wants_pilot" | "not_interested" | "needs_human" | "other";

// Values MUST match lib/sales.ts's leadStages exactly — that's the vocabulary
// the admin UI's stageLabel() and the stage filter dropdown actually know
// about. Anything else renders as an unlabeled raw string and can't be
// filtered to. There is no direct "still talking" stage in that list, so
// interested/price_question/needs_human/other all map to CONTACTED, the
// closest existing "we've been in touch, no verdict yet" stage.
const STAGE_BY_INTENT: Record<LeadIntent, string> = {
  wants_pilot: "PILOT_PROPOSED",
  not_interested: "LOST",
  interested: "CONTACTED",
  price_question: "CONTACTED",
  needs_human: "CONTACTED",
  other: "CONTACTED"
};

export function stageForIntent(intent: string, fallbackStage: string) {
  return STAGE_BY_INTENT[intent as LeadIntent] || fallbackStage;
}
