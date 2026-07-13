import assert from "node:assert/strict";
import test from "node:test";
import { validateUpload } from "../lib/storage";

function makeFile(name: string, type: string, content: Buffer | string) {
  const bytes = typeof content === "string" ? Buffer.from(content) : content;
  return new File([new Uint8Array(bytes)], name, { type });
}

test("validateUpload accepts a file whose content matches its claimed PDF extension", async () => {
  const file = makeFile("facture.pdf", "application/pdf", "%PDF-1.4\nreal pdf content\n");
  assert.equal(await validateUpload(file), null);
});

test("validateUpload rejects a non-PDF payload renamed to .pdf with a spoofed Content-Type", async () => {
  // Attack scenario: attacker uploads an HTML/script payload as "invoice.pdf"
  // with Content-Type: application/pdf — both filename and MIME type are
  // attacker-controlled and would previously be trusted blindly.
  const file = makeFile("invoice.pdf", "application/pdf", "<script>alert(1)</script>");
  const error = await validateUpload(file);
  assert.match(error || "", /contenu du fichier ne correspond pas/);
});

test("validateUpload accepts a file whose content matches its claimed PNG extension", async () => {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const file = makeFile("scan.png", "image/png", pngSignature);
  assert.equal(await validateUpload(file), null);
});

test("validateUpload rejects a JPEG renamed to .png", async () => {
  const jpegSignature = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const file = makeFile("scan.png", "image/png", jpegSignature);
  const error = await validateUpload(file);
  assert.match(error || "", /contenu du fichier ne correspond pas/);
});

test("validateUpload accepts a ZIP-based xlsx (OOXML) container", async () => {
  const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  const file = makeFile("classeur.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zipSignature);
  assert.equal(await validateUpload(file), null);
});

test("validateUpload rejects an unsupported extension outright, before any content check", async () => {
  const file = makeFile("script.exe", "application/octet-stream", "MZ");
  const error = await validateUpload(file);
  assert.match(error || "", /non autorise/);
});
