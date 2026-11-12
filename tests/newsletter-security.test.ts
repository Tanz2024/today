import test from "node:test";
import assert from "node:assert/strict";
import { newsletterSchema } from "../lib/newsletter-security.ts";

const base = { email: "Reader@Example.com", website: "", startedAt: Date.now() - 3000 };

test("accepts a valid signup and normalizes the email", () => {
  const result = newsletterSchema.safeParse(base);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, "reader@example.com");
});

test("rejects an invalid email", () => {
  assert.equal(newsletterSchema.safeParse({ ...base, email: "not-an-email" }).success, false);
});

// The honeypot itself is intentionally NOT enforced by the schema — a
// non-empty `website` must still parse successfully so the route's
// isHoneypotTriggered() check (tested in contact-security.test.ts) can run
// and pretend success, instead of the schema rejecting it outright and the
// visitor seeing a confusing "invalid email" error for a fine email.
test("still parses successfully when the honeypot field is filled in", () => {
  const result = newsletterSchema.safeParse({ ...base, website: "http://spam.example" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.website, "http://spam.example");
});

test("rejects unknown extra fields", () => {
  assert.equal(newsletterSchema.safeParse({ ...base, name: "Extra" }).success, false);
});
