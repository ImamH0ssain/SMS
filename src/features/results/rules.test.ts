import { describe, expect, it } from "vitest";
import { ResultStatus } from "@/generated/prisma/client";
import { AppError } from "@/lib/http";
import { assertOverduePublicationConfirmation, assertResultTransition, classifyGrade } from "@/features/results/rules";

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

describe("result transitions", () => {
  it.each([
    [ResultStatus.DRAFT, ResultStatus.PUBLISHED],
    [ResultStatus.DRAFT, ResultStatus.WITHHELD],
    [ResultStatus.WITHHELD, ResultStatus.PUBLISHED],
    [ResultStatus.PUBLISHED, ResultStatus.WITHHELD],
  ])("allows %s to %s", (from, to) => {
    expect(() => assertResultTransition(from, to, to === ResultStatus.WITHHELD ? "Review required" : undefined)).not.toThrow();
  });

  it.each([
    [ResultStatus.PUBLISHED, ResultStatus.DRAFT],
    [ResultStatus.WITHHELD, ResultStatus.DRAFT],
  ])("rejects %s to %s", (from, to) => {
    expect(() => assertResultTransition(from, to)).toThrow(AppError);
  });

  it("requires a reason for every withholding transition", () => {
    expect(() => assertResultTransition(ResultStatus.DRAFT, ResultStatus.WITHHELD)).toThrow("reason");
    expect(() => assertResultTransition(ResultStatus.PUBLISHED, ResultStatus.WITHHELD, "  ")).toThrow("reason");
  });
});
