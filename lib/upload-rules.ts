export const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx"]);
export const forbiddenExtensions = new Set(["svg", "html", "htm", "js", "mjs", "exe", "bat", "cmd", "php", "sh", "ps1", "vbs", "jar"]);

export function validateFileMeta(name: string, mimeType: string, size: number, maxSize: number) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  if (forbiddenExtensions.has(extension)) return "Type de fichier bloque pour securite.";
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) return "Type de fichier non autorise.";
  if (size > maxSize) return "Fichier trop volumineux. Maximum 10 Mo.";
  return null;
}
