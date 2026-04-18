import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 1,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
