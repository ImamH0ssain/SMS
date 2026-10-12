import { describe, expect, it } from "vitest";
import { EnrolmentStatus } from "@/generated/prisma/client";
import { assertStatusTransition, studentCode } from "@/features/students/rules";

describe("student record rules", () => {
  it("widens IDs after 9999 without losing uniqueness", () => {
    expect(studentCode("2026/27", 1)).toBe("SMS-2026-0001");
    expect(studentCode("2026/27", 10000)).toBe("SMS-2026-10000");
  });
  it("requires a reason for withdrawal", () => {
    expect(() => assertStatusTransition(EnrolmentStatus.ENROLLED, EnrolmentStatus.WITHDRAWN)).toThrow("reason");
    expect(() => assertStatusTransition(EnrolmentStatus.ENROLLED, EnrolmentStatus.WITHDRAWN, "Transferred")).not.toThrow();
  });
  it("requires a reason for deferral and limits reasons to 500 characters", () => {
    expect(() => assertStatusTransition(EnrolmentStatus.ENROLLED, EnrolmentStatus.DEFERRED)).toThrow("reason");
    expect(() => assertStatusTransition(EnrolmentStatus.ENROLLED, EnrolmentStatus.DEFERRED, "Medical leave")).not.toThrow();
    expect(() => assertStatusTransition(EnrolmentStatus.ENROLLED, EnrolmentStatus.DEFERRED, "x".repeat(501))).toThrow("500");
  });
  it("enforces the complete student status transition matrix", () => {
    const allowed: Array<[EnrolmentStatus, EnrolmentStatus]> = [
      [EnrolmentStatus.ENROLLED, EnrolmentStatus.DEFERRED],
      [EnrolmentStatus.ENROLLED, EnrolmentStatus.WITHDRAWN],
      [EnrolmentStatus.ENROLLED, EnrolmentStatus.COMPLETED],
      [EnrolmentStatus.DEFERRED, EnrolmentStatus.ENROLLED],
      [EnrolmentStatus.DEFERRED, EnrolmentStatus.WITHDRAWN],
    ];
    for (const [from, to] of allowed) expect(() => assertStatusTransition(from, to, "Valid reason")).not.toThrow();
    for (const from of Object.values(EnrolmentStatus)) {
      for (const to of Object.values(EnrolmentStatus)) {
        if (from !== to && !allowed.some(([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to)) {
          expect(() => assertStatusTransition(from, to, "Valid reason")).toThrow();
        }
      }
    }
  });
});
