export const FEATUREBASE_URL = process.env.NEXT_PUBLIC_FEATUREBASE_URL?.trim() || "";
export const FEEDBACK_FALLBACK_URL = "/contact?feedback=1";
export function getFeedbackUrl() { return FEATUREBASE_URL || FEEDBACK_FALLBACK_URL; }
