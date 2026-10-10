import { AppError } from "@/lib/http";

export const MAX_ZIP_ENTRIES = 1000;
export const MAX_DOCX_DECLARED_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

export function submissionTiming(now: Date, deadline: Date, isResubmission: boolean, closedAt: Date | null) {
  if (closedAt) throw new AppError("CONFLICT", 409, "This assessment is closed for submissions.");
  if (isResubmission && now.getTime() > deadline.getTime()) {
    throw new AppError("CONFLICT", 409, "Deadline has passed; contact the Registry.");
  }
  return { isLate: now.getTime() > deadline.getTime() };
}

export function validateSafeZipEntries(entries: Array<{ name: string; uncompressedSize: number }>) {
  if (entries.length > MAX_ZIP_ENTRIES) throw new AppError("VALIDATION_ERROR", 422, "DOCX contains too many archive entries.");
  let total = 0;
  for (const entry of entries) {
    if (entry.name.startsWith("/") || /^[a-zA-Z]:\//.test(entry.name) || entry.name.includes("\\") || entry.name.split("/").includes("..")) {
      throw new AppError("VALIDATION_ERROR", 422, "DOCX contains an unsafe archive path.");
    }
    total += entry.uncompressedSize;
    if (total > MAX_DOCX_DECLARED_UNCOMPRESSED_BYTES) {
      throw new AppError("VALIDATION_ERROR", 422, "DOCX declared content is too large.");
    }
  }
}
