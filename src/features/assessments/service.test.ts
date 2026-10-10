import { describe, expect, it } from "vitest";
import { mergeGradingGrid } from "@/features/assessments/rules";

describe("grading-grid membership", () => {
  it("contains eligible students plus withdrawn submitters and historic result holders without duplication", () => {
    const eligible = [{ id: "eligible", fullName: "Eligible Student" }];
    const withdrawnSubmitter = { id: "withdrawn", fullName: "Withdrawn Submitter" };
    const historicResultHolder = { id: "historic", fullName: "Historic Result Holder" };
    const rows = mergeGradingGrid(
      eligible,
      [{ studentId: withdrawnSubmitter.id, student: withdrawnSubmitter }],
      [{ studentId: historicResultHolder.id, student: historicResultHolder }, { studentId: withdrawnSubmitter.id, student: withdrawnSubmitter }],
    );
    expect(rows.map((row) => row.student.id).sort()).toEqual(["eligible", "historic", "withdrawn"]);
    expect(rows.find((row) => row.student.id === "withdrawn")).toMatchObject({ submission: { studentId: "withdrawn" }, result: { studentId: "withdrawn" } });
  });
});
