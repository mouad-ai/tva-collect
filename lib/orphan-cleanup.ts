import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { localUploadRoot } from "@/lib/storage";

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile()) return [fullPath];
      return [];
    })
  );
  return files.flat();
}

export async function findOrphanedLocalUploads() {
  const root = localUploadRoot();
  const [files, documents] = await Promise.all([
    walk(root),
    prisma.uploadedDocument.findMany({ select: { storageKey: true } })
  ]);
  const knownKeys = new Set(documents.map((document) => path.resolve(root, document.storageKey)));
  const orphaned = [];
  for (const file of files) {
    if (!knownKeys.has(path.resolve(file))) {
      const info = await stat(file);
      orphaned.push({ path: file, size: info.size });
    }
  }
  return orphaned;
}

export async function cleanupOrphanedLocalUploads({ enabled = false } = {}) {
  const orphaned = await findOrphanedLocalUploads();
  return {
    enabled,
    deleted: 0,
    orphaned,
    note: enabled ? "Deletion is intentionally not implemented yet; review orphaned files manually first." : "Dry run only."
  };
}
