import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

export default function BackToPlay() {
  return (
    <Link
      href="/play"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric"
    >
      <ArrowLeft size={14} />
      Back to Play
    </Link>
  );
}
