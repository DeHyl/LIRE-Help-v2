import { describe, it, expect, vi, afterEach } from "vitest";
import { db } from "../server/db.js";
import { logTokenUsage } from "../server/token-logger.js";

describe("token-logger failure logging (H16)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits a [token-logger:lost] JSON line on insert failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { /* noop */ });
    // Replace db.insert with a fake that rejects, so the catch branch fires.
    vi.spyOn(db, "insert").mockImplementation(() => ({
      values: () => Promise.reject(new Error("boom: connection refused")),
    }) as unknown as ReturnType<typeof db.insert>);

    logTokenUsage({
      tenantId: "t1",
      propertyId: null,
      sessionId: "sess-1",
      operation: "concierge_chat",
      model: "claude-opus-4-7",
      inputTokens: 1234,
      outputTokens: 567,
    });

    // Let the rejected promise settle.
    await new Promise((r) => setImmediate(r));

    const call = errorSpy.mock.calls.find((args) => args[0] === "[token-logger:lost]");
    expect(call, "expected a [token-logger:lost] error line").toBeDefined();
    const payload = JSON.parse(call![1]! as string);
    expect(payload).toMatchObject({
      operation: "concierge_chat",
      model: "claude-opus-4-7",
      tenantId: "t1",
      propertyId: null,
      inputTokens: 1234,
      outputTokens: 567,
    });
    expect(payload.costUsd).toMatch(/^\d+\.\d+$/);
    expect(payload.error).toContain("boom");
  });
});
