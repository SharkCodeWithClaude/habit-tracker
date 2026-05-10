import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../src/lib/encryption.js";

const TEST_KEY = "a".repeat(64); // 32 bytes hex-encoded

describe("encryption", () => {
  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "sk-ant-api03-test-key-1234567890";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "sk-ant-api03-test-key-1234567890";
    const encrypted1 = encrypt(plaintext, TEST_KEY);
    const encrypted2 = encrypt(plaintext, TEST_KEY);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("fails to decrypt with wrong key", () => {
    const plaintext = "sk-ant-api03-test-key-1234567890";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const wrongKey = "b".repeat(64);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("fails to decrypt tampered ciphertext", () => {
    const plaintext = "sk-ant-api03-test-key-1234567890";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const tampered = encrypted.slice(0, -4) + "ffff";
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe("");
  });

  it("handles unicode characters", () => {
    const plaintext = "キー🔑test";
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });
});
