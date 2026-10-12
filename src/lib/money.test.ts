import { describe, expect, it } from "vitest";

import { parseMoneyToMinor, parseSignedMoneyToMinor } from "@/lib/money";

describe("money parsing", () => {
  it("accepts positive payment values and rejects signed payment values", () => {
    expect(parseMoneyToMinor("£1,234.50")).toBe(123450);
    expect(parseMoneyToMinor("-1.00")).toBeNull();
  });

  it("parses a non-zero signed adjustment without accepting malformed pennies", () => {
    expect(parseSignedMoneyToMinor("-50.25")).toBe(-5025);
    expect(parseSignedMoneyToMinor("50")).toBe(5000);
    expect(parseSignedMoneyToMinor("1.234")).toBeNull();
  });
});
