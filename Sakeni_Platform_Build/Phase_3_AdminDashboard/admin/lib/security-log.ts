const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token|api[_-]?key|private[_-]?key|service[_-]?role|refresh|session|signature|webhook)/i;
const REDACTED = "[REDACTED]";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function redactSensitive(input: unknown, depth = 0): JsonValue {
  if (depth > 8) return "[MaxDepth]";
  if (input === null || input === undefined) return null;
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.slice(0, 50).map((item) => redactSensitive(item, depth + 1));

  if (typeof input === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSensitive(value, depth + 1);
    }
    return output;
  }

  return String(input);
}
