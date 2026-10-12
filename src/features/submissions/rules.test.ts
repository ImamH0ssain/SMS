import { describe, expect, it } from "vitest";
import { MAX_DOCX_DECLARED_UNCOMPRESSED_BYTES, MAX_ZIP_ENTRIES, submissionTiming, validateSafeZipEntries } from "@/features/submissions/rules";

describe("submission rules", () => {
  const deadline = new Date("2026-10-10T10:00:00Z");
  it("allows a late first submission but not a late resubmission", () => {
    expect(submissionTiming(new Date("2026-10-11T10:00:00Z"), deadline, false, null).isLate).toBe(true);
    expect(() => submissionTiming(new Date("2026-10-11T10:00:00Z"), deadline, true, null)).toThrow("Deadline");
  });
  it("rejects every submission after an explicit close", () => {
    expect(() => submissionTiming(new Date("2026-10-01T10:00:00Z"), deadline, false, new Date("2026-09-30T10:00:00Z"))).toThrow("closed");
    expect(() => submissionTiming(new Date("2026-10-01T10:00:00Z"), deadline, true, new Date("2026-09-30T10:00:00Z"))).toThrow("closed");
  });
  it("rejects crafted unsafe archive paths and excessive metadata", () => {
    expect(() => validateSafeZipEntries([{ name: "../word/document.xml", uncompressedSize: 1 }])).toThrow("unsafe");
    expect(() => validateSafeZipEntries([{ name: "C:/word/document.xml", uncompressedSize: 1 }])).toThrow("unsafe");
    expect(() => validateSafeZipEntries([{ name: "word\\document.xml", uncompressedSize: 1 }])).toThrow("unsafe");
    expect(() => validateSafeZipEntries(Array.from({ length: MAX_ZIP_ENTRIES + 1 }, (_, i) => ({ name: `word/${i}`, uncompressedSize: 1 })))).toThrow("too many");
    expect(() => validateSafeZipEntries([{ name: "word/document.xml", uncompressedSize: MAX_DOCX_DECLARED_UNCOMPRESSED_BYTES + 1 }])).toThrow("too large");
  });
});
