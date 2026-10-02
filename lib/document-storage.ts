import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const PDF_MAGIC_BYTES = Buffer.from("%PDF-");

/**
 * Validates that an uploaded file is a genuine PDF: checks the file
 * extension, the browser-supplied MIME type, and the leading bytes of the
 * file content (the extension/MIME type alone can be spoofed).
 */
export function isValidPdf(fileName: string, mimeType: string, content: Buffer) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension !== "pdf") return false;
  if (mimeType && mimeType !== "application/pdf" && mimeType !== "application/octet-stream") return false;
  return content.subarray(0, 1024).includes(PDF_MAGIC_BYTES);
}

export function safeDocumentDisplayName(fileName: string) {
  const safeName = fileName.replace(/[\u0000-\u001f\u007f/\\]/g, "_").trim().slice(0, 180);
  return safeName || "document.pdf";
}

export function safeDocumentContentDisposition(fileName: string) {
  const safeName = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_");
  return `inline; filename="${safeName}"`;
}

function requireBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
  return token;
}

export function buildDocumentStorageKey(workerId: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "pdf";
  // The worker id prefix plus a random id keeps keys unguessable and
  // collision-free across re-uploads.
  return `worker-documents/${workerId}/${randomUUID()}.${extension}`;
}

/**
 * Uploads a worker document to a private Vercel Blob store (`access:
 * "private"`). Private blobs are not reachable by their URL alone — reading
 * them back always requires an authenticated `get()` call made from the
 * server, so the document is only ever exposed to the browser through our
 * own authenticated API routes, never as a direct link.
 */
export async function uploadWorkerDocument(storageKey: string, content: Buffer, contentType: string) {
  const token = requireBlobToken();
  const blob = await put(storageKey, content, {
    access: "private",
    contentType,
    token,
  });
  return blob.url;
}

/**
 * Streams a previously uploaded private document back from Vercel Blob.
 * Callers MUST authenticate/authorize the request (worker ownership or
 * admin role) before calling this.
 */
export async function getWorkerDocumentStream(storageKey: string) {
  const token = requireBlobToken();
  const result = await get(storageKey, { access: "private", token });
  if (!result || result.statusCode !== 200) return null;
  return result;
}

export async function deleteWorkerDocumentBlob(storageKey: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await del(storageKey, { token }).catch(() => undefined);
}
