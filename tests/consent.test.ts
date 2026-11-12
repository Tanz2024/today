import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DEFAULT_CONSENT, readConsentCookie, writeConsentCookie } from "../lib/consent.ts";

function installDocument(initial = "") {
  let cookie = initial;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() { return cookie; },
      set cookie(value: string) { cookie = value.split(";")[0]; },
    },
  });
  return () => { delete (globalThis as { document?: unknown }).document; };
}

test("missing or invalid consent defaults to no optional consent", () => {
  const cleanup = installDocument();
  assert.equal(readConsentCookie(), null);
  cleanup();
});

test("saved consent restores both analytics and advertising choices", () => {
  const cleanup = installDocument();
  writeConsentCookie({ analytics: true, advertising: false });
  assert.deepEqual(readConsentCookie(), { ...DEFAULT_CONSENT, analytics: true, advertising: false });
  cleanup();
});

test("stale consent versions are ignored", () => {
  const cleanup = installDocument("brisastory_consent=%7B%22version%22%3A0%2C%22analytics%22%3Atrue%7D");
  assert.equal(readConsentCookie(), null);
  cleanup();
});

test("CMP mode uses Google's revocation API instead of the custom dialog", () => {
  const source = fs.readFileSync("components/privacy/ConsentManager.tsx", "utf8");
  assert.match(source, /showRevocationMessage/);
  assert.match(source, /callbackQueue/);
});

test("CMP mode bootstraps the required AdSense tag without enabling ad units", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED/);
  assert.match(layout, /adsbygoogle\.js\?client=ca-pub-5814338716030863/);
  assert.match(fs.readFileSync("components/ui/AdSlot.tsx", "utf8"), /NEXT_PUBLIC_ADS_ENABLED !== "true"/);
});
