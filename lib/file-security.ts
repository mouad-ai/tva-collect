import { createConnection } from "net";
import { DocumentSecurityScanStatus, ScannerProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canDownloadScannedDocument } from "@/lib/security-policy";

const CLAMD_TIMEOUT_MS = 15_000;
const CLAMD_CHUNK_SIZE = 64 * 1024;

function clamdConfigured() {
  return Boolean(process.env.CLAMAV_HOST);
}

/**
 * Scans a buffer with a clamd daemon over the INSTREAM protocol
 * (https://docs.clamav.net/manual/Usage/Scanning.html#instream): a stream of
 * 4-byte big-endian length-prefixed chunks terminated by a zero-length
 * chunk, followed by a single response line.
 */
function scanWithClamd(bytes: Buffer): Promise<{ infected: boolean; signature: string | null }> {
  const host = process.env.CLAMAV_HOST as string;
  const port = Number(process.env.CLAMAV_PORT || 3310);

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let response = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      socket.destroy();
      finish(() => reject(new Error("Delai depasse en contactant ClamAV.")));
    }, CLAMD_TIMEOUT_MS);

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < bytes.length; offset += CLAMD_CHUNK_SIZE) {
        const chunk = bytes.subarray(offset, offset + CLAMD_CHUNK_SIZE);
        const sizeHeader = Buffer.alloc(4);
        sizeHeader.writeUInt32BE(chunk.length, 0);
        socket.write(sizeHeader);
        socket.write(chunk);
      }
      const terminator = Buffer.alloc(4); // zero-length chunk ends the stream
      terminator.writeUInt32BE(0, 0);
      socket.write(terminator);
    });

    socket.on("data", (data) => {
      response += data.toString("utf8");
    });

    socket.on("error", (error) => {
      finish(() => reject(error));
    });

    socket.on("close", () => {
      finish(() => {
        const infectedMatch = response.match(/stream:\s*(.+?)\s*FOUND/);
        if (infectedMatch) {
          resolve({ infected: true, signature: infectedMatch[1] });
        } else if (response.includes("OK")) {
          resolve({ infected: false, signature: null });
        } else {
          reject(new Error(`Reponse ClamAV inattendue: ${response.trim().slice(0, 200)}`));
        }
      });
    });
  });
}

/**
 * Records a document's security scan result. Uploaded files are validated
 * for extension/MIME/content-signature at upload time (lib/storage.ts) —
 * this is the separate, optional malware-scanning step:
 *
 * - CLAMAV_HOST configured: streams the file to a real clamd daemon and
 *   records the actual verdict. A scanner we could not reach or parse is
 *   recorded as FAILED (fails closed — canDownloadScannedDocument() blocks
 *   anything that isn't CLEAN), never silently treated as clean.
 * - CLAMAV_HOST not configured: records CLEAN/NONE, but says so honestly in
 *   `details` — this reflects the upload-time checks only, not a real
 *   antivirus scan, so nobody mistakes this for real AV coverage.
 */
export async function scanUploadedFile(input: { documentId: string; firmId: string; bytes: Buffer }) {
  if (!clamdConfigured()) {
    return prisma.documentSecurityScan.create({
      data: {
        firmId: input.firmId,
        documentId: input.documentId,
        status: DocumentSecurityScanStatus.CLEAN,
        scannerProvider: ScannerProvider.NONE,
        details:
          "Aucun antivirus configure (CLAMAV_HOST absent). Verification limitee a l'extension, au type MIME et a la signature de contenu du fichier — pas de scan antivirus reel.",
        scannedAt: new Date()
      }
    });
  }

  try {
    const result = await scanWithClamd(input.bytes);
    return await prisma.documentSecurityScan.create({
      data: {
        firmId: input.firmId,
        documentId: input.documentId,
        status: result.infected ? DocumentSecurityScanStatus.INFECTED : DocumentSecurityScanStatus.CLEAN,
        scannerProvider: ScannerProvider.CLAMAV,
        details: result.infected ? `Menace detectee par ClamAV : ${result.signature}` : "Aucune menace detectee par ClamAV.",
        scannedAt: new Date()
      }
    });
  } catch (error) {
    // Fail closed: a scanner we could not reach or parse must never be
    // reported as clean — canDownloadScannedDocument() blocks non-CLEAN.
    return prisma.documentSecurityScan.create({
      data: {
        firmId: input.firmId,
        documentId: input.documentId,
        status: DocumentSecurityScanStatus.FAILED,
        scannerProvider: ScannerProvider.CLAMAV,
        details: `Echec du scan antivirus : ${error instanceof Error ? error.message : String(error)}`,
        scannedAt: new Date()
      }
    });
  }
}

export function assertDocumentDownloadAllowed(scan?: { status: DocumentSecurityScanStatus } | null) {
  if (!canDownloadScannedDocument(scan?.status)) {
    throw new Error("Ce fichier est bloque par le contrôle de securite.");
  }
}
