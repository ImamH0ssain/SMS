import { describe, expect, it } from "vitest";
import { ResultStatus } from "@/generated/prisma/client";
import { AppError } from "@/lib/http";
import { assertOverduePublicationConfirmation, classifyGrade } from "@/features/results/rules";

describe("classifyGrade", () => {
  it.each([[0, "Fail"], [39, "Fail"], [40, "Pass"], [59, "Pass"], [60, "Merit"], [69, "Merit"], [70, "Distinction"], [100, "Distinction"]] as const)("classifies %i as %s", (grade, expected) => {
    expect(classifyGrade(grade)).toBe(expected);
  });
});

describe("overdue publication confirmation", () => {
  it("requires an explicit override only when publishing an overdue student's result", () => {
    expect(() => assertOverduePublicationConfirmation(true, ResultStatus.PUBLISHED, false)).toThrow(AppError);
    expect(() => assertOverduePublicationConfirmation(true, ResultStatus.PUBLISHED, true)).not.toThrow();
    expect(() => assertOverduePublicationConfirmation(true, ResultStatus.DRAFT, false)).not.toThrow();
  });
});
