import { z } from "zod";

// Mirrors lib/contact-security.ts's shape/spirit for a much smaller payload —
// reuses that file's abuseHash/isHoneypotTriggered/isTooFast/isAllowedOrigin.
export const newsletterSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    // Deliberately NOT constrained to empty here: a non-empty value means
    // the honeypot was triggered (bot, or a browser/extension that
    // autofilled this hidden field), which the route handles gracefully via
    // isHoneypotTriggered() — pretending success instead of erroring. If
    // this were enforced at the schema level instead, that non-empty value
    // would fail parsing outright and the visitor would see a confusing
    // "invalid email" error for an email that was actually fine.
    website: z.string().max(500).optional().default(""),
    startedAt: z.coerce.number().int().positive(),
  })
  .strict();
