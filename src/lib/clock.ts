import "server-only";
import { env } from "@/lib/env";

let nowOverride: Date | undefined;

export function now() {
  return nowOverride ? new Date(nowOverride) : new Date();
}

export function setClockForTests(value?: Date) {
  nowOverride = value;
}

export function organisationDate(value = now()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.ORGANIZATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const field = (type: string) => parts.find((part) => part.type === type)?.value;
  return new Date(`${field("year")}-${field("month")}-${field("day")}T00:00:00.000Z`);
}
