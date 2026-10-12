import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/helpers/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://sms:sms@localhost:5432/sms_registry?schema=public",
      SESSION_SECRET: "unit-test-session-secret-that-is-long-enough",
    },
  },
});
