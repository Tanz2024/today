import "server-only";

export async function verifyTurnstile(token: unknown, request: Request, action?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || !token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, remoteip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "" }) });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    const hostname = request.headers.get("host")?.split(":")[0];
    return result.success === true && (!result.hostname || result.hostname === hostname) && (!action || !result.action || result.action === action);
  } catch { return false; }
}
