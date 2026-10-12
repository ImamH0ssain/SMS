import "dotenv/config";
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");
const host = new URL(url).hostname;
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(host)) throw new Error("db:reset only permits local DATABASE_URL hosts.");
execFileSync("npx", ["prisma", "migrate", "reset", "--force"], { stdio: "inherit" });
execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
