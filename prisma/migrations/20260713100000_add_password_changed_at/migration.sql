-- Enables session revocation on password change. Sessions are stateless
-- HMAC tokens with no server-side session table, so "revoke" is implemented
-- by comparing a session's issue time against this timestamp: any token
-- created before passwordChangedAt is treated as invalid (see lib/auth.ts).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
