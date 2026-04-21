import { defineConfig } from "vitest/config";

// Suite hits a real Railway test DB and truncates between each test via
// tests/setup.ts beforeEach. Running multiple workers against the same DB
// would make suites trample each other mid-run, so pin to one fork.
// Vitest 4 flattened poolOptions.forks.* onto the top level.
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 0,
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
