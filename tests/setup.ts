import { afterEach, beforeAll } from "vitest";

if (!process.env.DATABASE_URL) {
  throw new Error("Tests require DATABASE_URL (use a dedicated test DB, e.g. postgres://...lire_help_test).");
}
const url = new URL(process.env.DATABASE_URL);
if (!url.pathname.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests against a non-test database. DATABASE_URL path must end with '_test' (got '${url.pathname}').`,
  );
}

process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-secret-not-used-in-prod";

beforeAll(async () => {
  const { truncateAll } = await import("./helpers/seed.js");
  await truncateAll();
});

afterEach(async () => {
  const { truncateAll } = await import("./helpers/seed.js");
  await truncateAll();
});
