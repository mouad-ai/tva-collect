import { DocumentSecurityScanStatus, FirmStatus, UserRole } from "@prisma/client";

export function canAccessAdmin(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function canAccessBilling(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

export function canAccessFirmResource(userFirmId: string, resourceFirmId: string) {
  return userFirmId === resourceFirmId;
}

export function canDownloadScannedDocument(status?: DocumentSecurityScanStatus | null) {
  return !status || status === DocumentSecurityScanStatus.CLEAN;
}

export function canCreateFirmOwner(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function canInviteFirmRole(actorRole: UserRole, invitedRole: UserRole) {
  const actorAllowed = actorRole === UserRole.OWNER || actorRole === UserRole.MANAGER;
  const inviteAllowed = invitedRole === UserRole.MANAGER || invitedRole === UserRole.ASSISTANT || invitedRole === UserRole.READ_ONLY;
  return actorAllowed && inviteAllowed;
}

export function isInviteUsable(expiresAt: Date, acceptedAt: Date | null, revokedAt: Date | null, now = new Date()) {
  return !acceptedAt && !revokedAt && expiresAt > now;
}

export function clientUploadRequiresUserAccount() {
  return false;
}

export function canAccessAppForFirmStatus(status: FirmStatus, pathname: string) {
  if (status !== FirmStatus.SUSPENDED && status !== FirmStatus.CANCELLED) return true;
  return pathname.startsWith("/app/billing") || pathname.startsWith("/app/suspended");
}

export function canPublicUploadForFirmStatus(status: FirmStatus) {
  return status !== FirmStatus.SUSPENDED && status !== FirmStatus.CANCELLED;
}

export function postLoginRedirectForRole(role: UserRole) {
  return role === UserRole.ADMIN ? "/admin" : "/app";
}

export function postLoginDestination(user: {
  role: UserRole;
  firmId?: string | null;
  firm?: { status: FirmStatus } | null;
}) {
  if (user.role === UserRole.ADMIN) {
    return { ok: true as const, redirectTo: "/admin" };
  }

  if (!user.firmId || !user.firm) {
    return { ok: false as const, error: "account" as const };
  }

  if (user.firm.status === FirmStatus.SUSPENDED || user.firm.status === FirmStatus.CANCELLED) {
    return { ok: true as const, redirectTo: "/app/suspended" };
  }

  return { ok: true as const, redirectTo: "/app" };
}
