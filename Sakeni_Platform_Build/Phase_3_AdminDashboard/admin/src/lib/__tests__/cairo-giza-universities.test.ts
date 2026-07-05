import { describe, expect, it } from "vitest";
import { CAIRO_GIZA_UNIVERSITIES } from "../cairo-giza-universities";

describe("CAIRO_GIZA_UNIVERSITIES", () => {
  it("contains the supported Cairo and Giza universities used by student onboarding", () => {
    expect(CAIRO_GIZA_UNIVERSITIES).toEqual(
      expect.arrayContaining([
        "Cairo University",
        "Ain Shams University",
        "Helwan University",
        "October 6 University (O6U)",
        "Nile University",
      ]),
    );
  });

  it("does not include universities outside Cairo and Giza", () => {
    expect(CAIRO_GIZA_UNIVERSITIES).not.toEqual(
      expect.arrayContaining([
        "Alexandria University",
        "Mansoura University",
        "Tanta University",
        "Assiut University",
      ]),
    );
  });
});
