import { describe, expect, it } from "vitest";

import { validateSubmissionFile } from "@/features/submissions/validate";

describe("submission file validation", () => {
  it("accepts a structurally valid PDF", async () => {
    const file = new File([Buffer.from("%PDF-1.7\n")], "report.pdf", { type: "application/pdf" });
    await expect(validateSubmissionFile(file)).resolves.toEqual({ name: "report.pdf", mimeType: "application/pdf" });
  });

  it("rejects a PDF with the wrong signature", async () => {
    const file = new File([Buffer.from("not a pdf")], "report.pdf", { type: "application/pdf" });
    await expect(validateSubmissionFile(file)).rejects.toThrow("valid PDF");
  });

  it("rejects unsupported extensions before storage", async () => {
    const file = new File([Buffer.from("content")], "report.txt", { type: "text/plain" });
    await expect(validateSubmissionFile(file)).rejects.toThrow("Only PDF and DOCX");
  });
});
