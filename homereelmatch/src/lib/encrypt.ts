import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM authenticated encryption for PII fields (questionnaireJson).
// Storage format in the JSON column: { "_encrypted": "<24-hex-iv><32-hex-authTag><hex-ciphertext>" }
// Legacy rows without "_encrypted" are returned as-is (migration-safe).
// If ENCRYPTION_KEY is unset (dev), data is stored in plaintext with a console warning.

const ALGORITHM = "aes-256-gcm" as const;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) return null;
  if (hex.length !== 64) {
    console.error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Encryption skipped.");
    return null;
  }
  return Buffer.from(hex, "hex");
}

// IV: 12 bytes (96 bits) — recommended for GCM
// AuthTag: 16 bytes (128 bits)
// Encoded as: iv(24 hex) || authTag(32 hex) || ciphertext(hex)
export function encryptJson(data: Record<string, unknown>): Record<string, unknown> {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed: never silently persist PII in plaintext in production.
      throw new Error("ENCRYPTION_KEY not set or invalid in production. Refusing to store PII in plaintext.");
    }
    return data;
  }

  const plaintext = JSON.stringify(data);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = iv.toString("hex") + authTag.toString("hex") + encrypted.toString("hex");
  return { _encrypted: payload };
}

export function decryptJson(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;

  if (!("_encrypted" in obj)) {
    // Legacy row stored without encryption
    return obj;
  }

  const key = getKey();
  if (!key) {
    console.error("ENCRYPTION_KEY not set; cannot decrypt questionnaireJson.");
    return null;
  }

  const payload = obj._encrypted;
  if (typeof payload !== "string" || payload.length < 56) {
    console.error("Malformed encrypted payload.");
    return null;
  }

  try {
    const iv = Buffer.from(payload.slice(0, 24), "hex");
    const authTag = Buffer.from(payload.slice(24, 56), "hex");
    const encrypted = Buffer.from(payload.slice(56), "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
    return JSON.parse(plaintext) as Record<string, unknown>;
  } catch {
    console.error("Decryption failed (wrong key or tampered data).");
    return null;
  }
}
