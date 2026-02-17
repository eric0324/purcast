import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../password";

describe("hashPassword", () => {
  it("returns a bcrypt hash that differs from the original password", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).not.toBe("mypassword");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
});

describe("comparePassword", () => {
  it("returns true for the correct password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await comparePassword("correct-password", hash);
    expect(result).toBe(true);
  });

  it("returns false for the wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await comparePassword("wrong-password", hash);
    expect(result).toBe(false);
  });
});
