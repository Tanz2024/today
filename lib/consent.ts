export const CONSENT_COOKIE = "brisastory_consent";
export const CONSENT_VERSION = 1;

export type ConsentPreferences = {
  version: number;
  analytics: boolean;
  advertising: boolean;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    googlefc?: {
      callbackQueue?: Array<unknown>;
      showRevocationMessage?: () => void;
      usstatesoptout?: { openConfirmationDialog?: (callback?: (confirmed: boolean) => void) => void };
    };
  }
}

export const DEFAULT_CONSENT: ConsentPreferences = {
  version: CONSENT_VERSION,
  analytics: false,
  advertising: false,
};

export function hasConsentCookie() {
  return readConsentCookie() !== null;
}

export function consentModeUpdate(preferences: Pick<ConsentPreferences, "analytics" | "advertising">) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("brisastory:consent-change", { detail: preferences }));
  window.gtag?.("consent", "update", {
    analytics_storage: preferences.analytics ? "granted" : "denied",
    ad_storage: preferences.advertising ? "granted" : "denied",
    ad_user_data: preferences.advertising ? "granted" : "denied",
    ad_personalization: preferences.advertising ? "granted" : "denied",
  });
}

export function readConsentCookie(): ConsentPreferences | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split("; ").find((item) => item.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1];
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ConsentPreferences>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return { version: CONSENT_VERSION, analytics: parsed.analytics === true, advertising: parsed.advertising === true };
  } catch {
    return null;
  }
}

export function writeConsentCookie(preferences: Omit<ConsentPreferences, "version">) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, ...preferences }));
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
  consentModeUpdate(preferences);
}
