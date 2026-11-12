import test from "node:test";
import assert from "node:assert/strict";
import { contactSchema, hasUnsafeText, isAllowedOrigin, isHoneypotTriggered, isTooFast } from "../lib/contact-security.ts";
const valid = { name: "Tanz", email: "tanz@example.com", subject: "Hello there", message: "This is a valid contact message.", website: "", startedAt: Date.now() - 3000, turnstileToken: "token" };
test("accepts a valid submission", () => assert.equal(contactSchema.safeParse(valid).success, true));
test("rejects invalid email and oversized message", () => assert.equal(contactSchema.safeParse({ ...valid, email: "bad", message: "x".repeat(3001) }).success, false));
test("rejects CRLF/header injection", () => assert.equal(hasUnsafeText("hello\r\nBcc: attacker@example.com"), true));
test("detects honeypot", () => assert.equal(isHoneypotTriggered("bot"), true));
test("detects unrealistically fast submissions", () => assert.equal(isTooFast(Date.now() - 500), true));
test("allows only the apex origin in production", () => {
  assert.equal(isAllowedOrigin("https://brisastory.live/contact", null, true), true);
  assert.equal(isAllowedOrigin("https://www.brisastory.live/contact", null, true), false);
  assert.equal(isAllowedOrigin("https://evil.example/contact", null, true), false);
});
