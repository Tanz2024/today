/** Deployment switches are intentionally environment-driven so production
 * keeps its existing canonical URL and integrations. */
export const DEPLOY_ENV = process.env.NEXT_PUBLIC_DEPLOY_ENV?.trim().toLowerCase() || "production";
export const IS_STAGING = DEPLOY_ENV === "staging";
