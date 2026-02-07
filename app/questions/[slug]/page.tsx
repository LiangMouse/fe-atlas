import { notFound } from "next/navigation";

import { QuestionWorkspace } from "@/components/question-workspace";
import { getPublishedQuestionBySlug, getPublishedQuestions } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [challenge, allQuestions] = await Promise.all([
    getPublishedQuestionBySlug(slug),
    getPublishedQuestions(),
  ]);

  if (!challenge) {
    notFound();
  }

  return (
    <QuestionWorkspace
      challenge={challenge}
      relatedChallenges={allQuestions.map((item) => ({
        slug: item.slug,
        title: item.title,
      }))}
    />
  );
}
