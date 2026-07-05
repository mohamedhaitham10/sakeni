const ITERATIONS = 120_000;
const KEY_LENGTH = 256;

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH,
  );
  return new Uint8Array(bits);
}

export async function createPasswordVerifier(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return `pbkdf2_sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, verifier: string) {
  const [algorithm, iterations, saltValue, expectedHashValue] = verifier.split("$");
  if (algorithm !== "pbkdf2_sha256" || Number(iterations) !== ITERATIONS || !saltValue || !expectedHashValue) {
    return false;
  }

  const salt = fromBase64(saltValue);
  const expectedHash = fromBase64(expectedHashValue);
  const actualHash = await derivePasswordHash(password, salt);
  if (actualHash.length !== expectedHash.length) return false;

  let diff = 0;
  for (let i = 0; i < actualHash.length; i += 1) diff |= actualHash[i] ^ expectedHash[i];
  return diff === 0;
}
