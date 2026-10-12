import { describe, expect, it } from "vitest";

import { validateSubmissionFile } from "@/features/submissions/validate";

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries: Record<string, string>) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(value);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(crc32(data), 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    Buffer.concat([localHeader, nameBytes, data]).copy(local[local.length] = Buffer.alloc(30 + nameBytes.length + data.length));
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(crc32(data), 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([centralHeader, nameBytes]));
    offset += 30 + nameBytes.length + data.length;
  }
  const body = Buffer.concat([...local, ...central]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(central.reduce((size, item) => size + item.length, 0), 12);
  end.writeUInt32LE(body.length - central.reduce((size, item) => size + item.length, 0), 16);
  return Buffer.concat([body, end]);
}

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

  it("accepts a valid DOCX with a generic MIME type", async () => {
    const file = new File([storedZip({ "[Content_Types].xml": "<types />", "word/document.xml": "<document />" })], "report.docx", { type: "application/octet-stream" });
    await expect(validateSubmissionFile(file)).resolves.toEqual({ name: "report.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  });

  it("accepts a valid DOCX when the browser omits the MIME type", async () => {
    const file = new File([storedZip({ "word/document.xml": "<document />" })], "report.docx", { type: "" });
    await expect(validateSubmissionFile(file)).resolves.toEqual({ name: "report.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  });

  it("rejects a renamed plain ZIP without the DOCX document entry", async () => {
    const file = new File([storedZip({ "notes.txt": "not a document" })], "report.docx", { type: "application/octet-stream" });
    await expect(validateSubmissionFile(file)).rejects.toThrow("word/document.xml");
  });
});
