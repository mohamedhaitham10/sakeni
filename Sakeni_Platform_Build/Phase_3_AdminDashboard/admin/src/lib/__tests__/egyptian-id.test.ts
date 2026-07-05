import { describe, expect, it } from "vitest";
import { parseEgyptianNationalID } from "../egyptian-id";

describe("parseEgyptianNationalID", () => {
  it("accepts a valid Cairo national ID", () => {
    const result = parseEgyptianNationalID("29901010112356");

    expect(result).toMatchObject({
      isValid: true,
      birthdate: "1999-01-01",
      governorate: "Cairo",
      gender: "Male",
    });
  });

  it("accepts a valid Giza national ID", () => {
    const result = parseEgyptianNationalID("30205212112356");

    expect(result).toMatchObject({
      isValid: true,
      birthdate: "2002-05-21",
      governorate: "Giza",
    });
  });

  it("rejects valid IDs from unsupported governorates", () => {
    const result = parseEgyptianNationalID("29901010212356");

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Cairo");
    expect(result.error).toContain("Giza");
  });

  it("rejects impossible dates", () => {
    const result = parseEgyptianNationalID("29902310112356");

    expect(result).toMatchObject({
      isValid: false,
      error: "Invalid birth day.",
    });
  });
});
