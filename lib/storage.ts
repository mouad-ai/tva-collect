import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { createHash, createHmac, randomUUID } from "crypto";
import path from "path";
import { allowedExtensions, allowedMimeTypes, maxUploadSize } from "@/lib/constants";

function storageMode() {
  return (process.env.UPLOAD_STORAGE || "local").toLowerCase();
}

function requireStorageEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for S3 upload storage.`);
  return value;
}

function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Buffer | string, input: string) {
  return createHmac("sha256", key).update(input).digest();
}

function hmacHex(key: Buffer | string, input: string) {
  return createHmac("sha256", key).update(input).digest("hex");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateStamp(value: string) {
  return value.slice(0, 8);
}

function encodeS3Key(key: string) {
  return key.split(/[\\/]/).map(encodeURIComponent).join("/");
}

function s3RequestUrl(storageKey: string) {
  const endpoint = requireStorageEnv("S3_ENDPOINT").replace(/\/$/, "");
  const bucket = requireStorageEnv("S3_BUCKET");
  return new URL(`${endpoint}/${encodeURIComponent(bucket)}/${encodeS3Key(storageKey)}`);
}

function s3Authorization(input: {
  method: "GET" | "PUT";
  url: URL;
  payloadHash: string;
  contentType?: string;
  now: string;
}) {
  const accessKey = requireStorageEnv("S3_ACCESS_KEY");
  const secretKey = requireStorageEnv("S3_SECRET_KEY");
  const region = process.env.S3_REGION || "us-east-1";
  const host = input.url.host;
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": input.now
  };
  if (input.contentType) headers["content-type"] = input.contentType;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key]}\n`)
    .join("");
  const canonicalRequest = [
    input.method,
    input.url.pathname,
    input.url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    input.payloadHash
  ].join("\n");
  const scope = `${dateStamp(input.now)}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.now,
    scope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp(input.now)), region), "s3"), "aws4_request");
  const signature = hmacHex(signingKey, stringToSign);
  return {
    headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function requestHeaders(headers: Record<string, string>) {
  const { host: _host, ...rest } = headers;
  return rest;
}

async function saveS3Upload(file: File, clientCollectionId: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storageKey = `${clientCollectionId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = s3RequestUrl(storageKey);
  const now = amzDate();
  const payloadHash = sha256Hex(bytes);
  const signed = s3Authorization({ method: "PUT", url, payloadHash, contentType: file.type || "application/octet-stream", now });
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...requestHeaders(signed.headers),
      authorization: signed.authorization,
      "content-type": file.type || "application/octet-stream"
    },
    body: bytes
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`S3 upload failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { storageKey, size: bytes.length };
}

async function readS3Upload(storageKey: string) {
  const url = s3RequestUrl(storageKey);
  const now = amzDate();
  const payloadHash = sha256Hex("");
  const signed = s3Authorization({ method: "GET", url, payloadHash, now });
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...requestHeaders(signed.headers),
      authorization: signed.authorization
    }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`S3 download failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, size: bytes.length, fullPath: `s3://${process.env.S3_BUCKET}/${storageKey}` };
}

export function localUploadRoot() {
  const configured = process.env.LOCAL_UPLOAD_DIR || "";
  const scopedName = configured && configured !== "./uploads" && configured !== "uploads"
    ? path.basename(configured)
    : "";
  return path.join(process.cwd(), "uploads", scopedName);
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
  if (storageMode() === "s3") return saveS3Upload(file, clientCollectionId);
  if (storageMode() !== "local") throw new Error(`Unsupported UPLOAD_STORAGE=${process.env.UPLOAD_STORAGE}`);
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storageKey = path.posix.join(clientCollectionId, `${randomUUID()}.${extension}`);
  const fullPath = path.join(localUploadRoot(), ...storageKey.split("/"));
  await mkdir(path.dirname(fullPath), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, bytes);
  return { storageKey, size: bytes.length };
}

export async function readLocalUpload(storageKey: string) {
  if (storageMode() === "s3") return readS3Upload(storageKey);
  if (storageMode() !== "local") throw new Error(`Unsupported UPLOAD_STORAGE=${process.env.UPLOAD_STORAGE}`);
  const root = localUploadRoot();
  const fullPath = path.resolve(root, ...storageKey.split(/[\\/]/));
  const relative = path.relative(root, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid storage path");
  const info = await stat(fullPath);
  const bytes = await readFile(fullPath);
  return { bytes, size: info.size, fullPath };
}
