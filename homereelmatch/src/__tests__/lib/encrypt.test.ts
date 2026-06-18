import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { encryptJson, decryptJson } from "@/lib/encrypt";

const VALID_KEY = "a".repeat(64); // 32 bytes as 64 hex chars

function withKey(key: string | undefined, fn: () => void) {
  const original = process.env.ENCRYPTION_KEY;
  if (key === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = key;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = original;
    }
  }
}

describe("encryptJson / decryptJson — round-trip", () => {
  it("暗号化 → 復号で元のオブジェクトが得られる", () => {
    withKey(VALID_KEY, () => {
      const original = {
        purchaseTiming: "1年以内",
        area: "東京都",
        budget: "4000万〜5000万",
        message: "詳しく聞きたいです",
      };
      const encrypted = encryptJson(original);
      expect(encrypted).toHaveProperty("_encrypted");
      expect(typeof (encrypted as { _encrypted: unknown })._encrypted).toBe("string");

      const decrypted = decryptJson(encrypted);
      expect(decrypted).toEqual(original);
    });
  });

  it("毎回異なる暗号文が生成される（IVのランダム性）", () => {
    withKey(VALID_KEY, () => {
      const data = { test: "value" };
      const enc1 = encryptJson(data) as { _encrypted: string };
      const enc2 = encryptJson(data) as { _encrypted: string };
      expect(enc1._encrypted).not.toBe(enc2._encrypted);
    });
  });

  it("空オブジェクトも round-trip できる", () => {
    withKey(VALID_KEY, () => {
      const decrypted = decryptJson(encryptJson({}));
      expect(decrypted).toEqual({});
    });
  });

  it("ネストしたオブジェクトも保持される", () => {
    withKey(VALID_KEY, () => {
      const data = { a: { b: { c: [1, 2, 3] } }, d: null };
      const decrypted = decryptJson(encryptJson(data));
      expect(decrypted).toEqual(data);
    });
  });
});

describe("encryptJson — ENCRYPTION_KEY 未設定時", () => {
  it("平文のままオブジェクトを返す（_encrypted キーなし）", () => {
    withKey(undefined, () => {
      const data = { name: "田中太郎" };
      const result = encryptJson(data);
      expect(result).toEqual(data);
      expect(result).not.toHaveProperty("_encrypted");
    });
  });
});

describe("decryptJson — レガシー行（暗号化前）", () => {
  it("_encrypted キーがない行はそのまま返す", () => {
    const legacy = { purchaseTiming: "すぐに", area: "大阪府" };
    const result = decryptJson(legacy);
    expect(result).toEqual(legacy);
  });

  it("null は null を返す", () => {
    expect(decryptJson(null)).toBeNull();
  });

  it("undefined は null を返す", () => {
    expect(decryptJson(undefined)).toBeNull();
  });

  it("配列は null を返す", () => {
    expect(decryptJson(["a", "b"])).toBeNull();
  });

  it("文字列は null を返す", () => {
    expect(decryptJson("not an object")).toBeNull();
  });
});

describe("decryptJson — 不正データ", () => {
  it("ENCRYPTION_KEY 未設定で _encrypted キーがある場合は null を返す", () => {
    withKey(undefined, () => {
      const result = decryptJson({ _encrypted: "aabbcc" });
      expect(result).toBeNull();
    });
  });

  it("ペイロードが短すぎる場合は null を返す", () => {
    withKey(VALID_KEY, () => {
      const result = decryptJson({ _encrypted: "tooshort" });
      expect(result).toBeNull();
    });
  });

  it("ペイロードが改ざんされている場合は null を返す（GCM 認証失敗）", () => {
    withKey(VALID_KEY, () => {
      const enc = encryptJson({ secret: "data" }) as { _encrypted: string };
      // Flip a byte in the ciphertext portion (after IV+authTag = 56 hex chars)
      const tampered =
        enc._encrypted.slice(0, 57) +
        (enc._encrypted[57] === "f" ? "0" : "f") +
        enc._encrypted.slice(58);
      const result = decryptJson({ _encrypted: tampered });
      expect(result).toBeNull();
    });
  });
});
