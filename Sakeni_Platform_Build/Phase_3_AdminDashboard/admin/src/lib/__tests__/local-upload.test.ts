import { describe, expect, it } from "vitest";
import { isSupportedPhotoUrl, validateImageFile } from "../local-upload";

describe("local upload validation", () => {
  it("given a device image upload when validating then only safe image names, types, and sizes pass", () => {
    expect(validateImageFile(new File(["x"], "apartment.jpg", { type: "image/jpeg" }))).toBe("");
    expect(validateImageFile(new File(["x"], "../apartment.jpg", { type: "image/jpeg" }))).toContain("safe filename");
    expect(validateImageFile(new File(["x"], "apartment.svg", { type: "image/svg+xml" }))).toContain("safe filename");
    expect(validateImageFile(new File(["x".repeat(12)], "apartment.png", { type: "image/png" }), 4)).toContain("smaller");
  });

  it("given a direct photo URL when adding listing photos then insecure remote URLs and SVG data URLs are rejected", () => {
    expect(isSupportedPhotoUrl("https://images.example.com/a.webp")).toBe(true);
    expect(isSupportedPhotoUrl("http://localhost:3000/a.jpg")).toBe(true);
    expect(isSupportedPhotoUrl("http://evil.example/a.jpg")).toBe(false);
    expect(isSupportedPhotoUrl("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(isSupportedPhotoUrl("data:image/svg+xml;base64,PHN2Zy8+")).toBe(false);
  });
});
