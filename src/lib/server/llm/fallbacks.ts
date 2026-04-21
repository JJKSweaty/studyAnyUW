import { gradingSchema, type TopicPack } from "@/lib/schemas";
import { estimateReadingSeconds, uniqueBy } from "@/lib/utils";

import type { ParsedContent } from "../ingest/parse";

export function fallbackTopicPack(input: {
  workspaceName: string;
  parsed: ParsedContent;
  text: string;
}): TopicPack {
  const headings =
    input.parsed.headings.length > 0 ? input.parsed.headings : [`${input.workspaceName} overview`];
  const topics = headings.slice(0, 6).map((heading, index) => ({
    title: heading,
    summary:
      input.parsed.definitions[index] ??
      `Core ideas, patterns, and likely exam reasoning for ${heading}.`,
    detailedSummary:
      input.parsed.bulletGroups.slice(index, index + 3).join(" ") ||
      `Review definitions, tradeoffs, and reasoning steps related to ${heading}.`,
    keyPoints: uniqueBy(
      [
        input.parsed.bulletGroups[index],
        input.parsed.bulletGroups[index + 1],
        input.parsed.definitions[index],
      ].filter(Boolean) as string[],
      (item) => item.toLowerCase(),
    ),
    commonMistakes: [
      `Confusing ${heading} with a related concept without comparing the constraints.`,
      `Memorizing ${heading} without understanding when it breaks down.`,
    ],
    formulas: [],
    sourceRefs: [],
    subtopics: [],
  }));

  const questions = uniqueBy(
    [
      ...input.parsed.questionCandidates.map((questionText, index) => ({
        type: (index % 2 === 0 ? "short_answer" : "explain") as
          | "short_answer"
          | "explain",
        topic: topics[index % topics.length]?.title ?? input.workspaceName,
        subtopic: "",
        difficulty: (index % 3 === 0 ? "hard" : "medium") as "medium" | "hard",
        questionText,
        options: [],
        correctAnswer:
          input.parsed.qaPairs[index]?.answer ??
          `A strong answer should define the concept, explain the tradeoff, and justify it with reasoning.`,
        gradingRubric: [
          "Defines the concept accurately.",
          "Explains why it matters or when it applies.",
          "Includes a tradeoff, edge case, or comparison.",
        ],
        explanation:
          "This checks whether you can explain the concept instead of repeating a definition.",
        sourceRefs: [],
        confidenceScore: 0.55,
        estimatedTimeSeconds: 75,
      })),
      ...topics.slice(0, 8).map((topic, index) => ({
        type: (index % 2 === 0 ? "compare" : "teach_back") as "compare" | "teach_back",
        topic: topic.title,
        subtopic: "",
        difficulty: (index % 3 === 0 ? "hard" : "medium") as "medium" | "hard",
        questionText:
          index % 2 === 0
            ? `Compare ${topic.title} to a nearby alternative. What tradeoff decides which one you should use?`
            : `Teach back the core idea behind ${topic.title} in your own words.`,
        options: [],
        correctAnswer: topic.summary,
        gradingRubric: [
          "Explains the core concept accurately.",
          "Includes the relevant tradeoff or failure mode.",
          "Uses concrete reasoning instead of vague memorization.",
        ],
        explanation: `This question checks whether ${topic.title} is actually understood.`,
        sourceRefs: [],
        confidenceScore: 0.5,
        estimatedTimeSeconds: 90,
      })),
    ],
    (item) => `${item.type}:${item.topic}:${item.questionText.toLowerCase()}`,
  ).slice(0, 14);

  return {
    courseSummary: input.text.slice(0, 320),
    conciseSummary: `Study pack generated from local parsing for ${input.workspaceName}.`,
    keyDefinitions: input.parsed.definitions.slice(0, 10),
    likelyExamQuestions: input.parsed.questionCandidates.slice(0, 8),
    topics,
    flashcards: topics.slice(0, 8).map((topic) => ({
      topic: topic.title,
      front: `What is the key idea behind ${topic.title}?`,
      back: topic.summary,
      sourceRefs: [],
    })),
    questions,
  };
}

export function fallbackGrading(input: {
  answer: string;
  correctAnswer: string;
  rubric: string[];
}) {
  const answer = input.answer.toLowerCase();
  const rubricMatches = input.rubric.filter((item) => {
    const keywords = item
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 3);

    const matchedKeywords = keywords.filter((token) => answer.includes(token)).length;
    return matchedKeywords >= Math.max(1, Math.floor(keywords.length / 2));
  }).length;
  const correctTokens = input.correctAnswer
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3);
  const correctMatches = correctTokens.filter((token) => answer.includes(token)).length;
  const score = Math.min(
    1,
    Math.max(
      0,
      rubricMatches * 0.35 +
        Math.min(0.45, correctMatches / Math.max(4, correctTokens.length)) +
        (answer.length > 80 ? 0.1 : 0),
    ),
  );

  return gradingSchema.parse({
    score,
    correctness: score,
    completeness: Math.max(0.2, score),
    clarity: Math.min(1, estimateReadingSeconds(input.answer) / 120),
    verdict: score >= 0.7 ? "correct" : score >= 0.4 ? "partial" : "incorrect",
    missingPoints: score >= 0.7 ? [] : input.rubric.slice(rubricMatches),
    strengths: score > 0.2 ? ["Included some relevant keywords from the expected answer."] : [],
    conciseFeedback:
      score >= 0.7
        ? "Mostly correct. Tighten the reasoning and keep the explanation focused."
        : "Partially correct. Cover more rubric points and justify the answer more clearly.",
    improvedAnswer: input.correctAnswer,
    groundedAnswer: input.correctAnswer,
  });
}
