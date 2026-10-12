import { defineConfig } from "vitest/config";
import path from "node:path";
import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for integration tests.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/helpers/server-only.ts"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    fileParallelism: false,
  },
});
