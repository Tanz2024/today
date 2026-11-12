import { notFound } from "next/navigation";
import Link from "next/link";
import { Query } from "node-appwrite";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";
import { getDatabases } from "@/lib/appwrite";
import { APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, APPWRITE_DATABASE_ID } from "@/lib/community-submissions";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const displayName = decodeName(name);
  return buildMetadata({ title: `${displayName} — Community contributor`, description: `Published stories shared with TodayAI by ${displayName}.`, path: `/community/contributors/${name}` });
}

function decodeName(value: string) { return decodeURIComponent(value).replace(/-/g, " ").trim(); }
export default async function ContributorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const displayName = decodeName(name);
  const db = getDatabases();
  if (!db) notFound();
  let stories: Array<Record<string, string>> = [];
  try { const result = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("source", "community"), Query.equal("status", "published"), Query.equal("displayNameSnapshot", displayName), Query.orderDesc("publishedAt"), Query.limit(50)]); stories = result.documents as unknown as Array<Record<string, string>>; } catch { notFound(); }
  if (!stories.length) notFound();
  return <main><Container className="max-w-5xl py-16 sm:py-24"><Link href="/community" className="text-sm font-semibold text-electric">← Community</Link><p className="mt-12 text-[11px] font-bold uppercase tracking-[.16em] text-electric">Community contributor</p><h1 className="mt-4 font-heading text-5xl font-black tracking-[-.06em] sm:text-7xl">{displayName}</h1><p className="mt-5 max-w-2xl text-lg text-muted">Published stories shared with TodayAI by this contributor.</p><div className="mt-14 grid gap-8 sm:grid-cols-2">{stories.map((story) => <Link key={story.$id} href={`/${story.category}/${story.slug}`} className="border-t border-card-border pt-5 transition hover:text-electric"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">{story.category}</p><h2 className="mt-3 font-heading text-2xl font-semibold">{story.title}</h2><p className="mt-3 text-sm text-muted">{story.description}</p></Link>)}</div></Container></main>;
}
