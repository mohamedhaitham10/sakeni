import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "../security-headers.mjs";

describe("browser security headers", () => {
  it("given production headers when building CSP then dangerous defaults are denied and eval is absent", () => {
    const csp = buildContentSecurityPolicy({ dev: false });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("given security headers when applied to every route then clickjacking and MIME sniffing protections are present", () => {
    const headers = Object.fromEntries(buildSecurityHeaders({ dev: false }).map((header) => [header.key, header.value]));

    expect(headers["Content-Security-Policy"]).toBeTruthy();
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
  });
});
