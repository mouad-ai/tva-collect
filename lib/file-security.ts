import { DocumentSecurityScanStatus, ScannerProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canDownloadScannedDocument } from "@/lib/security-policy";

export async function createCleanLocalScan(documentId: string, firmId: string) {
  return prisma.documentSecurityScan.create({
    data: {
      firmId,
      documentId,
      status: DocumentSecurityScanStatus.CLEAN,
      scannerProvider: ScannerProvider.NONE,
      details: "Local development scan provider is NONE; file accepted after extension and MIME checks.",
      scannedAt: new Date()
    }
  });
}

export function assertDocumentDownloadAllowed(scan?: { status: DocumentSecurityScanStatus } | null) {
  if (!canDownloadScannedDocument(scan?.status)) {
    throw new Error("Ce fichier est bloque par le contrôle de securite.");
  }
}
