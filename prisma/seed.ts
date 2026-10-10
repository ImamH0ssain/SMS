import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EnrolmentStatus, PaymentStatus, ResultStatus, UserRole } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const today = new Date();
const date = (offset: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));

function crc32(input: Buffer) {
  let value = 0xffffffff;
  for (const byte of input) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

/** A small, uncompressed DOCX-compatible ZIP fixture for upload validation and demos. */
function storedZip(entries: Array<{ name: string; content: string }>) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content, "utf8");
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, content);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0, 8); directory.writeUInt16LE(0, 10);
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(content.length, 20); directory.writeUInt32LE(content.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += local.length + name.length + content.length;
  }
  const directory = Buffer.concat(central);
  const ending = Buffer.alloc(22);
  ending.writeUInt32LE(0x06054b50, 0); ending.writeUInt16LE(entries.length, 8); ending.writeUInt16LE(entries.length, 10); ending.writeUInt32LE(directory.length, 12); ending.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, ending]);
}

async function main() {
  await prisma.auditEvent.deleteMany(); await prisma.result.deleteMany(); await prisma.submissionRevision.deleteMany(); await prisma.submission.deleteMany(); await prisma.assessment.deleteMany(); await prisma.payment.deleteMany(); await prisma.feeAdjustment.deleteMany(); await prisma.feeAssignment.deleteMany(); await prisma.user.deleteMany(); await prisma.student.deleteMany(); await prisma.programmeFeeRule.deleteMany(); await prisma.module.deleteMany(); await prisma.programme.deleteMany(); await prisma.studentIdCounter.deleteMany();
  const [staffOne, staffTwo] = await Promise.all([
    prisma.user.create({ data: { name: "Amelia Reid", role: UserRole.REGISTRY_STAFF, isDemoPersona: true } }),
    prisma.user.create({ data: { name: "Marcus Cole", role: UserRole.REGISTRY_STAFF, isDemoPersona: true } }),
  ]);
  const computing = await prisma.programme.create({ data: { code: "BSC-CS", name: "BSc Computer Science" } });
  const business = await prisma.programme.create({ data: { code: "BA-BUS", name: "BA Business Management" } });
  const [cs101, cs205, bus101] = await Promise.all([
    prisma.module.create({ data: { code: "CS101", name: "Programming Foundations", programmeId: computing.id } }),
    prisma.module.create({ data: { code: "CS205", name: "Data Structures", programmeId: computing.id } }),
    prisma.module.create({ data: { code: "BUS101", name: "Business Fundamentals", programmeId: business.id } }),
  ]);
  await prisma.programmeFeeRule.createMany({ data: [
    { programmeId: computing.id, academicYear: "2026/27", amountMinor: 900000, dueDate: date(-30) },
    { programmeId: business.id, academicYear: "2026/27", amountMinor: 840000, dueDate: date(30) },
    { programmeId: computing.id, academicYear: "2025/26", amountMinor: 870000, dueDate: date(-365) },
  ] });
  const createStudent = async (code: string, name: string, email: string, programmeId: string, year: string, status: EnrolmentStatus, demo = false, reason?: string) => {
    const student = await prisma.student.create({ data: { studentCode: code, fullName: name, email, dateOfBirth: new Date("2003-05-12"), programmeId, academicYear: year, status, statusReason: reason } });
    await prisma.user.create({ data: { name, role: UserRole.STUDENT, studentId: student.id, isDemoPersona: demo } });
    const rule = await prisma.programmeFeeRule.findUniqueOrThrow({ where: { programmeId_academicYear: { programmeId, academicYear: year } } });
    const fee = await prisma.feeAssignment.create({ data: { studentId: student.id, amountMinor: rule.amountMinor, dueDate: rule.dueDate, academicYear: year } });
    return { student, fee };
  };
  const amina = await createStudent("SMS-2026-0001", "Amina Rahman", "amina@example.test", computing.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  const ben = await createStudent("SMS-2026-0002", "Ben Carter", "ben@example.test", computing.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  const clara = await createStudent("SMS-2026-0003", "Clara Hayes", "clara@example.test", business.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  const dev = await createStudent("SMS-2026-0004", "Dev Shah", "dev@example.test", computing.id, "2026/27", EnrolmentStatus.DEFERRED, false, "Medical leave");
  const ella = await createStudent("SMS-2026-0005", "Ella Wright", "ella@example.test", computing.id, "2026/27", EnrolmentStatus.WITHDRAWN, true, "Transferred institution");
  const farah = await createStudent("SMS-2025-0001", "Farah Khan", "farah@example.test", computing.id, "2025/26", EnrolmentStatus.COMPLETED, true);
  const gita = await createStudent("SMS-2026-0006", "Gita Singh", "gita@example.test", computing.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  const hugo = await createStudent("SMS-2026-0007", "Hugo Patel", "hugo@example.test", computing.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  const isla = await createStudent("SMS-2026-0008", "Isla Moore", "isla@example.test", computing.id, "2026/27", EnrolmentStatus.ENROLLED, true);
  await prisma.payment.createMany({ data: [
    { feeAssignmentId: amina.fee.id, amountMinor: 900000, receivedOn: date(-10), reference: "SEED-AMINA-FULL" },
    { feeAssignmentId: ben.fee.id, amountMinor: 200000, receivedOn: date(-10), reference: "SEED-BEN-PART" },
    { feeAssignmentId: farah.fee.id, amountMinor: 870000, receivedOn: date(-360), reference: "SEED-FARAH-FULL" },
    { feeAssignmentId: dev.fee.id, amountMinor: 50000, receivedOn: date(-20), reference: "SEED-DEV-VOID", status: PaymentStatus.VOIDED, voidedAt: date(-19), voidReason: "Duplicate bank import" },
  ] });
  await prisma.feeAdjustment.create({ data: { feeAssignmentId: dev.fee.id, amountMinor: 2500, reason: "Seeded administrative charge", createdById: staffOne.id } });
  const [pastOpen, future, closed, priorYear] = await Promise.all([
    prisma.assessment.create({ data: { title: "Algorithms coursework", moduleId: cs205.id, academicYear: "2026/27", deadline: new Date(today.getTime() - 86_400_000 * 4), createdById: staffOne.id } }),
    prisma.assessment.create({ data: { title: "Programming project", moduleId: cs101.id, academicYear: "2026/27", deadline: new Date(today.getTime() + 86_400_000 * 10), createdById: staffOne.id } }),
    prisma.assessment.create({ data: { title: "Business case study", moduleId: bus101.id, academicYear: "2026/27", deadline: date(-20), closedAt: date(-1), createdById: staffTwo.id } }),
    prisma.assessment.create({ data: { title: "Data Structures final", moduleId: cs205.id, academicYear: "2025/26", deadline: date(-370), closedAt: date(-360), createdById: staffTwo.id } }),
  ]);
  const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? ".uploads"); await mkdir(uploadDir, { recursive: true }); const key = "seed-sample-pdf"; await writeFile(join(uploadDir, key), "%PDF-1.4\n% Seed fixture\n");
  const docxKey = "seed-resubmission.docx";
  const docx = storedZip([
    { name: "[Content_Types].xml", content: "<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>" },
    { name: "_rels/.rels", content: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>" },
    { name: "word/document.xml", content: "<?xml version=\"1.0\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Seed document</w:t></w:r></w:p></w:body></w:document>" },
  ]);
  await writeFile(join(uploadDir, docxKey), docx);
  const benSubmission = await prisma.submission.create({ data: { studentId: ben.student.id, assessmentId: future.id } });
  const benRevision = await prisma.submissionRevision.create({ data: { submissionId: benSubmission.id, revisionNumber: 1, isLate: false, fileName: "ben-project.pdf", mimeType: "application/pdf", sizeBytes: 23, storageKey: key } }); await prisma.submission.update({ where: { id: benSubmission.id }, data: { currentRevisionId: benRevision.id } });
  const ellaSubmission = await prisma.submission.create({ data: { studentId: ella.student.id, assessmentId: pastOpen.id } }); const ellaRevision = await prisma.submissionRevision.create({ data: { submissionId: ellaSubmission.id, revisionNumber: 1, isLate: true, fileName: "ella-late.pdf", mimeType: "application/pdf", sizeBytes: 23, storageKey: "seed-ella-pdf" } }); await prisma.submission.update({ where: { id: ellaSubmission.id }, data: { currentRevisionId: ellaRevision.id } }); await writeFile(join(uploadDir, "seed-ella-pdf"), "%PDF-1.4\n% Late fixture\n");
  const gitaSubmission = await prisma.submission.create({ data: { studentId: gita.student.id, assessmentId: future.id } });
  await prisma.submissionRevision.create({ data: { submissionId: gitaSubmission.id, revisionNumber: 1, isLate: false, fileName: "gita-project.pdf", mimeType: "application/pdf", sizeBytes: 23, storageKey: "seed-gita-pdf" } });
  await writeFile(join(uploadDir, "seed-gita-pdf"), "%PDF-1.4\n% First submission fixture\n");
  const gitaRevision = await prisma.submissionRevision.create({ data: { submissionId: gitaSubmission.id, revisionNumber: 2, isLate: false, fileName: "gita-resubmission.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: docx.length, storageKey: docxKey } });
  await prisma.submission.update({ where: { id: gitaSubmission.id }, data: { currentRevisionId: gitaRevision.id } });
  await prisma.result.createMany({ data: [
    { studentId: amina.student.id, assessmentId: future.id, grade: 70, status: ResultStatus.PUBLISHED, publishedAt: date(-1), publishedById: staffOne.id },
    { studentId: ben.student.id, assessmentId: future.id, grade: 60, status: ResultStatus.WITHHELD, withheldReason: "Academic integrity review" },
    { studentId: ella.student.id, assessmentId: pastOpen.id, grade: 39, status: ResultStatus.DRAFT },
    { studentId: clara.student.id, assessmentId: closed.id, grade: 40, status: ResultStatus.PUBLISHED, publishedAt: date(-10), publishedById: staffOne.id },
    { studentId: isla.student.id, assessmentId: future.id, grade: 59, status: ResultStatus.PUBLISHED, publishedAt: date(-1), publishedById: staffOne.id },
    { studentId: gita.student.id, assessmentId: future.id, grade: 69, status: ResultStatus.PUBLISHED, publishedAt: date(-1), publishedById: staffOne.id },
    { studentId: farah.student.id, assessmentId: priorYear.id, grade: 38, status: ResultStatus.PUBLISHED, publishedAt: date(-100), publishedById: staffOne.id },
  ] });
  await prisma.studentIdCounter.createMany({ data: [{ academicYearStart: 2025, lastIssued: 1 }, { academicYearStart: 2026, lastIssued: 8 }] });
  console.log("Seeded SMS Registry demo data.");
}

main().finally(() => prisma.$disconnect());
