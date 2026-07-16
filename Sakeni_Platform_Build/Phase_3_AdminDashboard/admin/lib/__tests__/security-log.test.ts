import { describe, expect, it } from "vitest";
import { redactSensitive } from "../security-log";

describe("security log redaction", () => {
  it("given nested secret-bearing metadata when redacting then sensitive values are removed recursively", () => {
    const redacted = redactSensitive({
      userId: "user-1",
      authorization: "Bearer secret-token",
      nested: {
        apiKey: "sk-live-value",
        safe: "kept",
        values: [{ refreshToken: "refresh" }],
      },
    });

    expect(redacted).toEqual({
      userId: "user-1",
      authorization: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        safe: "kept",
        values: [{ refreshToken: "[REDACTED]" }],
      },
    });
  });
});
