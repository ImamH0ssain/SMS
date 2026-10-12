import { env } from "@/lib/env";

export function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: env.APP_CURRENCY,
  }).format(amountMinor / 100);
}

export function parseMoneyToMinor(input: string) {
  const normalized = input.trim().replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function parseSignedMoneyToMinor(input: string) {
  const normalized = input.trim().replace(/[£,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const sign = normalized.startsWith("-") ? -1 : 1;
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  return sign * (Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
