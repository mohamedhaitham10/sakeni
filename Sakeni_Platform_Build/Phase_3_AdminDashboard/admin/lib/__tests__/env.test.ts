import { describe, expect, it } from "vitest";
import { ConfigurationError, getSupabaseServerEnv, parseAllowedOrigins } from "../env";

describe("environment validation", () => {
  it("given missing Supabase configuration when reading server env then startup fails closed", () => {
    expect(() => getSupabaseServerEnv({})).toThrow(ConfigurationError);
  });

  it("given a service role marker in the public anon key when reading server env then it is rejected", () => {
    expect(() => getSupabaseServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "service_role.secret",
    })).toThrow(/service-role/);
  });

  it("given production origins when parsing CORS config then only exact HTTPS origins are accepted", () => {
    expect(parseAllowedOrigins("https://app.example.com, https://admin.example.com", { nodeEnv: "production" }))
      .toEqual(["https://app.example.com", "https://admin.example.com"]);
    expect(() => parseAllowedOrigins("*", { nodeEnv: "production" })).toThrow(/wildcard/);
    expect(() => parseAllowedOrigins("http://localhost:3000", { nodeEnv: "production" })).toThrow(/HTTPS/);
    expect(() => parseAllowedOrigins("https://app.example.com.evil.test", { nodeEnv: "production" }))
      .not.toThrow();
  });
});
