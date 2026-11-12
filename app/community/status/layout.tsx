import { buildMetadata } from "@/lib/seo";

// The status page is a client component, so its metadata lives here. It shows
// a signed-in contributor's own submissions — private, not for search.
export const metadata = buildMetadata({
  title: "Your submissions",
  description: "Check the status of stories you have shared with TodayAI.",
  path: "/community/status",
  noindex: true,
});

export default function CommunityStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
