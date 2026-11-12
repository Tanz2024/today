import { Query } from "node-appwrite";
import { getQuestions } from "@/lib/questions";
import { getQuestionPoll } from "@/lib/question-polls";
import { getPollCounts } from "@/lib/polls";
import { APPWRITE_DATABASE_ID, APPWRITE_QUESTION_REASONS_COLLECTION_ID, getDatabases } from "@/lib/appwrite";
import { getMostDiscussedQuestions, getNewQuestions, type DiscoveryItem } from "@/lib/question-discovery-core";

const questionRecords = () => getQuestions().map((question) => ({ slug: question.slug, title: question.question, category: question.category, publishedAt: question.publishedAt }));

export function getNewRealQuestions(excludeSlugs: ReadonlySet<string> = new Set()) {
  return getNewQuestions(questionRecords(), 6, excludeSlugs);
}

export async function getMostDiscussedRealQuestions(): Promise<DiscoveryItem[]> {
  const databases = getDatabases();
  if (!databases) return [];
  const questions = getQuestions();
  try {
    const candidates = await Promise.all(questions.map(async (question) => {
      const reasonResult = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_QUESTION_REASONS_COLLECTION_ID, [Query.equal("questionSlug", question.slug), Query.equal("status", "approved"), Query.limit(1)]);
      const poll = getQuestionPoll(question.slug);
      let voteCount = 0;
      if (poll) {
        try { voteCount = Object.values(await getPollCounts(poll)).reduce((sum, count) => sum + count, 0); } catch { voteCount = 0; }
      }
      return { slug: question.slug, title: question.question, category: question.category, publishedAt: question.publishedAt, approvedReasonCount: reasonResult.total, voteCount };
    }));
    return getMostDiscussedQuestions(candidates, 5);
  } catch { return []; }
}
