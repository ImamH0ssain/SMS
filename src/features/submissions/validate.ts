import "server-only";
import { env } from "@/lib/env";
import { AppError } from "@/lib/http";
import { MAX_DOCX_DECLARED_UNCOMPRESSED_BYTES, MAX_ZIP_ENTRIES, validateSafeZipEntries } from "@/features/submissions/rules";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function u16(buffer: Buffer, offset: number) { return buffer.readUInt16LE(offset); }
function u32(buffer: Buffer, offset: number) { return buffer.readUInt32LE(offset); }

function zipEntries(buffer: Buffer) {
  const signature = Buffer.from("PK\x05\x06");
  const end = buffer.lastIndexOf(signature);
  if (end < 0 || end + 22 > buffer.length) throw new AppError("VALIDATION_ERROR", 422, "DOCX archive directory is invalid.");
  const count = u16(buffer, end + 10);
  const directoryOffset = u32(buffer, end + 16);
  if (count > MAX_ZIP_ENTRIES || directoryOffset >= buffer.length) throw new AppError("VALIDATION_ERROR", 422, "DOCX archive directory is invalid.");
  let offset = directoryOffset;
  const entries: Array<{ name: string; uncompressedSize: number }> = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length || u32(buffer, offset) !== 0x02014b50) throw new AppError("VALIDATION_ERROR", 422, "DOCX archive directory is invalid.");
    const size = u32(buffer, offset + 24);
    const nameLength = u16(buffer, offset + 28);
    const extraLength = u16(buffer, offset + 30);
    const commentLength = u16(buffer, offset + 32);
    const nameStart = offset + 46;
    const next = nameStart + nameLength + extraLength + commentLength;
    if (next > buffer.length) throw new AppError("VALIDATION_ERROR", 422, "DOCX archive directory is invalid.");
    entries.push({ name: buffer.subarray(nameStart, nameStart + nameLength).toString("utf8"), uncompressedSize: size });
    offset = next;
  }
  validateSafeZipEntries(entries);
  if (!entries.some((entry) => entry.name === "word/document.xml")) throw new AppError("VALIDATION_ERROR", 422, "DOCX must contain word/document.xml.");
}

export async function validateSubmissionFile(file: File) {
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  const name = file.name.normalize("NFKC").replace(/[\r\n\\/]/g, "_").slice(0, 180) || "submission";
  const lower = name.toLowerCase();
  if (file.size <= 0 || file.size > maxBytes) throw new AppError("VALIDATION_ERROR", 422, `File must be between 1 byte and ${env.MAX_UPLOAD_MB} MB.`);
  const data = Buffer.from(await file.arrayBuffer());
  if (lower.endsWith(".pdf")) {
    if (file.type !== PDF_MIME || !data.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new AppError("VALIDATION_ERROR", 422, "Upload a valid PDF file.");
    return { name, mimeType: PDF_MIME };
  }
  if (lower.endsWith(".docx")) {
    if (file.type !== DOCX_MIME || !data.subarray(0, 4).equals(Buffer.from("PK\x03\x04"))) throw new AppError("VALIDATION_ERROR", 422, "Upload a valid DOCX file.");
    zipEntries(data);
    return { name, mimeType: DOCX_MIME };
  }
  throw new AppError("VALIDATION_ERROR", 422, "Only PDF and DOCX files are accepted.");
}
