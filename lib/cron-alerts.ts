import "server-only";
import { Resend } from "resend";

export async function alertCronFailure(name: string, error: unknown) {
  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.CONTACT_INBOX;
  if (!apiKey || !inbox) return;
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "TodayAI Alerts <hello@brisastory.live>",
      to: inbox,
      subject: `[TodayAI] ${name} Cron failed`,
      text: `${name} did not complete successfully.\n\nTime: ${new Date().toISOString()}\nError: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  } catch (alertError) {
    console.error(`[cron/${name}] failure alert could not be sent`, alertError instanceof Error ? alertError.message : "unknown error");
  }
}

export async function alertCronSuccess(name: string, details: { dateKey?: string; publishAt?: string; idempotent?: boolean } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.CONTACT_INBOX;
  if (!apiKey || !inbox) return;
  try {
    const resend = new Resend(apiKey);
    const malaysiaPublishAt = details.dateKey ? `${details.dateKey}T00:00:00+08:00` : details.publishAt ?? "Unavailable";
    const result = details as typeof details & {
      automation?: { status?: string; errors?: string[] };
      published?: string[];
      articleDrafts?: { results?: Array<Record<string, unknown>> };
      curation?: { assignments?: number };
      cleanup?: { deleted?: number };
      music?: { count?: number };
      picks?: number;
      weeklyQuestion?: string;
    };
    const lines = [
      `${name} completed successfully.`,
      "",
      `Edition date: ${details.dateKey ?? "Unavailable"}`,
      `Written publish time: ${malaysiaPublishAt}`,
      `Status: ${details.idempotent ? "Already committed (safe repeat)" : "Committed"}`,
    ];
    if (result.automation?.status) lines.push(`AI/editorial status: ${result.automation.status}${result.automation.errors?.length ? ` (${result.automation.errors.join(", ")})` : ""}`);
    if (Array.isArray(result.published)) lines.push(`Interactive items published: ${result.published.length} (${result.published.join(", ")})`);
    if (result.articleDrafts) {
      const articleResults = Array.isArray(result.articleDrafts.results) ? result.articleDrafts.results : [];
      lines.push(`Article drafts created: ${articleResults.filter((item) => typeof item === "object" && item !== null && "appwriteId" in item && !("duplicate" in item && item.duplicate)).length}`);
      lines.push(`Article drafts skipped/failed: ${articleResults.filter((item) => typeof item === "object" && item !== null && (("duplicate" in item && item.duplicate) || ("status" in item && item.status === "failed"))).length}`);
    }
    if (result.curation?.assignments) lines.push(`Homepage assignments updated: ${result.curation.assignments}`);
    if (result.cleanup?.deleted !== undefined) lines.push(`Old temporary records cleaned: ${result.cleanup.deleted}`);
    if (result.music) lines.push(`Music tracks selected: ${result.music.count ?? 0}`);
    if (result.picks !== undefined) lines.push(`Movies/shows/games/places selected: ${result.picks}`);
    if (result.weeklyQuestion) lines.push(`Weekly question: ${result.weeklyQuestion}`);
    await resend.emails.send({
      from: "TodayAI Alerts <hello@brisastory.live>",
      to: inbox,
      subject: `[TodayAI] ${name} Cron completed successfully`,
      text: lines.join("\n"),
    });
  } catch (error) {
    console.error(`[cron/${name}] success alert could not be sent`, error instanceof Error ? error.message : "unknown error");
  }
}
