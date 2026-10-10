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
});
