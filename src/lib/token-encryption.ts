import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required in production");
    }
    // Dev fallback — deterministic, not secure, never used in production.
    return Buffer.from("dev-token-encryption-key-not-for-prod-use!!".padEnd(32, "0").slice(0, 32));
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return key;
}

export function encryptToken(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return `${PREFIX}${payload.toString("base64")}`;
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;

  // Graceful migration: plaintext tokens stored before encryption was introduced
  // continue to work until they are next written (refresh or reconnect).
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  try {
    const key = getEncryptionKey();
    const payload = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = payload.subarray(0, IV_BYTES);
    const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return null;
  }
}
