import { describe, expect, it } from "vitest";
import { createPasswordVerifier, verifyPassword } from "../auth-security";

describe("password verifier", () => {
  it("verifies the correct password and rejects the wrong one", async () => {
    const verifier = await createPasswordVerifier("SakeniLaunch123!");

    await expect(verifyPassword("SakeniLaunch123!", verifier)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", verifier)).resolves.toBe(false);
  });

  it("does not store plaintext passwords", async () => {
    const password = "AnotherStrongPassword123!";
    const verifier = await createPasswordVerifier(password);

    expect(verifier).toMatch(/^pbkdf2_sha256\$\d+\$/);
    expect(verifier).not.toContain(password);
  });
});
