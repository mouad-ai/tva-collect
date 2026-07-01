import assert from "node:assert/strict";
import test from "node:test";
import { DocumentSecurityScanStatus, FirmStatus, UserRole } from "@prisma/client";
import {
  canAccessAdmin,
  canAccessBilling,
  canAccessFirmResource,
  canAccessAppForFirmStatus,
  canCreateFirmOwner,
  canDownloadScannedDocument,
  canInviteFirmRole,
  canPublicUploadForFirmStatus,
  clientUploadRequiresUserAccount,
  isInviteUsable,
  postLoginRedirectForRole
} from "../lib/security-policy";
import { isPasswordResetUsable } from "../lib/password-reset";

test("firm users cannot access resources owned by another firm", () => {
  assert.equal(canAccessFirmResource("firm-a", "firm-a"), true);
  assert.equal(canAccessFirmResource("firm-a", "firm-b"), false);
});

test("assistant and read-only users cannot access billing or admin", () => {
  assert.equal(canAccessBilling(UserRole.ASSISTANT), false);
  assert.equal(canAccessBilling(UserRole.READ_ONLY), false);
  assert.equal(canAccessAdmin(UserRole.ASSISTANT), false);
  assert.equal(canAccessAdmin(UserRole.READ_ONLY), false);
});

test("owner and manager can access billing but not SaaS admin", () => {
  assert.equal(canAccessBilling(UserRole.OWNER), true);
  assert.equal(canAccessBilling(UserRole.MANAGER), true);
  assert.equal(canAccessBilling(UserRole.ADMIN), false);
  assert.equal(canAccessAdmin(UserRole.OWNER), false);
  assert.equal(canAccessAdmin(UserRole.MANAGER), false);
});

test("admin role is required for SaaS admin", () => {
  assert.equal(canAccessAdmin(UserRole.ADMIN), true);
});

test("login redirects admin to SaaS admin and firm users to app", () => {
  assert.equal(postLoginRedirectForRole(UserRole.ADMIN), "/admin");
  assert.equal(postLoginRedirectForRole(UserRole.OWNER), "/app");
  assert.equal(postLoginRedirectForRole(UserRole.MANAGER), "/app");
  assert.equal(postLoginRedirectForRole(UserRole.ASSISTANT), "/app");
  assert.equal(postLoginRedirectForRole(UserRole.READ_ONLY), "/app");
});

test("admin can provision a firm owner", () => {
  assert.equal(canCreateFirmOwner(UserRole.ADMIN), true);
  assert.equal(canCreateFirmOwner(UserRole.OWNER), false);
  assert.equal(canCreateFirmOwner(UserRole.MANAGER), false);
});

test("owner and manager can invite team roles only", () => {
  assert.equal(canInviteFirmRole(UserRole.OWNER, UserRole.ASSISTANT), true);
  assert.equal(canInviteFirmRole(UserRole.MANAGER, UserRole.READ_ONLY), true);
  assert.equal(canInviteFirmRole(UserRole.ASSISTANT, UserRole.OWNER), false);
  assert.equal(canInviteFirmRole(UserRole.OWNER, UserRole.ADMIN), false);
});

test("client upload flow does not require a user account", () => {
  assert.equal(clientUploadRequiresUserAccount(), false);
});

test("expired or accepted invites cannot be reused", () => {
  const now = new Date("2026-06-28T12:00:00.000Z");
  assert.equal(isInviteUsable(new Date("2026-06-29T12:00:00.000Z"), null, null, now), true);
  assert.equal(isInviteUsable(new Date("2026-06-27T12:00:00.000Z"), null, null, now), false);
  assert.equal(isInviteUsable(new Date("2026-06-29T12:00:00.000Z"), new Date("2026-06-28T13:00:00.000Z"), null, now), false);
  assert.equal(isInviteUsable(new Date("2026-06-29T12:00:00.000Z"), null, new Date("2026-06-28T13:00:00.000Z"), now), false);
});

test("expired or used password reset tokens cannot be reused", () => {
  const now = new Date("2026-06-28T12:00:00.000Z");
  assert.equal(isPasswordResetUsable({ expiresAt: new Date("2026-06-28T13:00:00.000Z"), usedAt: null }, now), true);
  assert.equal(isPasswordResetUsable({ expiresAt: new Date("2026-06-28T11:59:00.000Z"), usedAt: null }, now), false);
  assert.equal(isPasswordResetUsable({ expiresAt: new Date("2026-06-28T13:00:00.000Z"), usedAt: new Date("2026-06-28T12:05:00.000Z") }, now), false);
});

test("suspended or cancelled firms are blocked from app operations and public uploads", () => {
  assert.equal(canAccessAppForFirmStatus(FirmStatus.ACTIVE, "/app/clients"), true);
  assert.equal(canAccessAppForFirmStatus(FirmStatus.SUSPENDED, "/app/clients"), false);
  assert.equal(canAccessAppForFirmStatus(FirmStatus.SUSPENDED, "/app/billing"), true);
  assert.equal(canAccessAppForFirmStatus(FirmStatus.CANCELLED, "/app/collections"), false);
  assert.equal(canPublicUploadForFirmStatus(FirmStatus.ACTIVE), true);
  assert.equal(canPublicUploadForFirmStatus(FirmStatus.SUSPENDED), false);
  assert.equal(canPublicUploadForFirmStatus(FirmStatus.CANCELLED), false);
});

test("quarantined or suspicious documents cannot be downloaded", () => {
  assert.equal(canDownloadScannedDocument(DocumentSecurityScanStatus.CLEAN), true);
  assert.equal(canDownloadScannedDocument(DocumentSecurityScanStatus.QUARANTINED), false);
  assert.equal(canDownloadScannedDocument(DocumentSecurityScanStatus.INFECTED), false);
  assert.equal(canDownloadScannedDocument(DocumentSecurityScanStatus.SUSPICIOUS), false);
});
