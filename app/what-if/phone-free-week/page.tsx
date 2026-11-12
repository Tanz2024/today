import { buildMetadata } from "@/lib/seo";
import WhatIfExperience from "@/components/what-if/WhatIfExperience";

export const metadata = buildMetadata({
  title: "Your Phone Is Gone. For Seven Days.",
  description: "A short interactive story about attention, friendship and finding your way without a phone.",
  path: "/what-if/phone-free-week",
});

export default function PhoneFreeWeekPage() {
  return <WhatIfExperience />;
}
