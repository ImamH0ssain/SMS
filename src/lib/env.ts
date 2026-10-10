import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters."),
  ENABLE_DEMO_SESSION: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).default("auto"),
  ORGANIZATION_TIMEZONE: z.string().default("Europe/London"),
  APP_CURRENCY: z.string().length(3).default("GBP"),
  UPLOAD_DIR: z.string().default(".uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(4).default(4),
});

export const env = environmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  ENABLE_DEMO_SESSION: process.env.ENABLE_DEMO_SESSION,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  ORGANIZATION_TIMEZONE: process.env.ORGANIZATION_TIMEZONE,
  APP_CURRENCY: process.env.APP_CURRENCY,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB,
});
