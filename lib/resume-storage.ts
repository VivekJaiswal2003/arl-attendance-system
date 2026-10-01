import path from "node:path";

const RESUME_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function getResumeFormat(fileName: string, suppliedMimeType: string) {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  const mimeType = RESUME_MIME_TYPES[extension];
  if (!mimeType || (suppliedMimeType && suppliedMimeType !== mimeType && suppliedMimeType !== "application/octet-stream")) {
    return null;
  }
  return { extension, mimeType };
}

export function hasResumeSignature(extension: string, content: Buffer) {
  if (extension === "pdf") return content.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  if (extension === "doc") return content.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (extension === "docx") {
    return content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && content.includes(Buffer.from("word/document.xml"));
  }
  return false;
}

export function safeResumeDisplayName(fileName: string, extension: string) {
  const safeName = fileName.replace(/[\u0000-\u001f\u007f/\\]/g, "_").trim().slice(0, 180);
  return safeName || `resume.${extension}`;
}

export function safeResumeContentDisposition(fileName: string) {
  const safeName = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_");
  return `inline; filename="${safeName}"`;
}

export function resolveResumeStoragePath(workerId: string, storedPath: string) {
  const workerDirectory = path.resolve(process.cwd(), "private", "resumes", workerId);
  const filePath = path.resolve(process.cwd(), storedPath);
  const relativePath = path.relative(workerDirectory, filePath);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return filePath;
}