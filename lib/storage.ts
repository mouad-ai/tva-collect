import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { allowedExtensions, allowedMimeTypes, maxUploadSize } from "@/lib/constants";

export function localUploadRoot() {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR || "./uploads");
}

export function validateUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.type)) {
    return "Type de fichier non autorise.";
  }
  if (file.size > maxUploadSize) {
    return "Fichier trop volumineux. Maximum 10 Mo.";
  }
  return null;
}

export async function saveLocalUpload(file: File, clientCollectionId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storageKey = path.join(clientCollectionId, `${randomUUID()}.${extension}`);
  const fullPath = path.join(localUploadRoot(), storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);
  return { storageKey, size: bytes.length };
}

export async function readLocalUpload(storageKey: string) {
  const fullPath = path.join(localUploadRoot(), storageKey);
  const root = localUploadRoot();
  if (!fullPath.startsWith(root)) throw new Error("Invalid storage path");
  const info = await stat(fullPath);
  const bytes = await readFile(fullPath);
  return { bytes, size: info.size, fullPath };
}
