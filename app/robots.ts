import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { IS_STAGING } from "@/lib/deployment";

// One group for every crawler (Googlebot and OAI-SearchBot previously had
// identical copies). Noindex pages stay crawlable so the directive is seen;
// only API and admin endpoints are disallowed.
export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: [{ ["userAgent"]: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] }],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
