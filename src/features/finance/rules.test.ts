import { describe, expect, it } from "vitest";
import { assertPaymentAllowed, isOverdue, outstandingBalance } from "@/features/finance/rules";

describe("finance rules", () => {
  it("derives balances without a stored balance", () => expect(outstandingBalance(10000, -500, 2500)).toBe(7000));
  it("does not mark a balance overdue on its due date", () => {
    const due = new Date("2026-10-09T00:00:00.000Z");
    expect(isOverdue(1, due, due)).toBe(false);
    expect(isOverdue(1, due, new Date("2026-10-10T00:00:00.000Z"))).toBe(true);
  });
  it("blocks overpayment", () => expect(() => assertPaymentAllowed(101, 100, new Date("2026-10-09"), new Date("2026-10-09"))).toThrow("exceed"));
});
