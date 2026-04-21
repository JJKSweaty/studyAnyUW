import { gradingSchema, type QuestionInput, type TopicPack, type TopicInput } from "@/lib/schemas";
import { estimateReadingSeconds, uniqueBy } from "@/lib/utils";

import type { ParsedContent } from "../ingest/parse";
import { inferStudyContext } from "../study-context";

const genericHeadingBlocklist = new Set([
  "course snapshot",
  "topic map",
  "definitions",
  "practice questions",
  "weak spot drills",
  "fast review checklist",
  "goal",
  "output requirements",
  "preferred structure",
  "grounding requirements",
  "student focus",
  "current workspace summary",
  "workspace tags",
  "study context",
  "important",
]);

export function fallbackTopicPack(input: {
  workspaceName: string;
  parsed: ParsedContent;
  text: string;
}): TopicPack {
  const studyContext = inferStudyContext({
    workspaceName: input.workspaceName,
    text: input.parsed.normalizedText || input.text,
  });

  const topics = buildFallbackTopics(input);
  const questions = buildFallbackQuestions({
    workspaceName: input.workspaceName,
    parsed: input.parsed,
    topics,
    isCodingCourse: studyContext.isCodingCourse,
    detectedLanguages: studyContext.detectedLanguages,
  });

  return {
    courseSummary: summarizeSourceText(input.parsed.normalizedText || input.text),
    conciseSummary: `Study pack generated from pasted source context for ${input.workspaceName}.`,
    keyDefinitions: input.parsed.definitions.slice(0, 10),
    likelyExamQuestions: uniqueBy(
      [
        ...input.parsed.questionCandidates,
        ...questions.slice(0, 8).map((question) => question.questionText),
      ],
      (item) => item.toLowerCase(),
    ).slice(0, 8),
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

function buildFallbackTopics(input: {
  workspaceName: string;
  parsed: ParsedContent;
  text: string;
}) {
  const topicCandidates = uniqueBy(
    [
      ...input.parsed.structuredTopics.map((topic) => topic.title),
      ...input.parsed.headings,
      ...input.parsed.definitions.map((definition) => definition.split(":")[0]?.trim() ?? ""),
      ...input.parsed.qaPairs.map((item) => deriveTopicTitle(item.question)),
      ...input.parsed.questionCandidates.map(deriveTopicTitle),
      ...input.parsed.bulletGroups.slice(0, 12).map(deriveTopicTitle),
      ...extractParagraphSeeds(input.text),
    ]
      .map(normalizeTopicTitle)
      .filter(Boolean),
    (item) => item.toLowerCase(),
  )
    .filter((item) => !genericHeadingBlocklist.has(item.toLowerCase()))
    .slice(0, 6);

  const titles = topicCandidates.length > 0 ? topicCandidates : [normalizeTopicTitle(input.workspaceName) || "Core concepts"];

  return titles.map((title, index) => {
    const structuredTopic = input.parsed.structuredTopics.find((topic) => topic.title.toLowerCase() === title.toLowerCase());
    const relatedDefinitions = input.parsed.definitions.filter((definition) =>
      matchesTopic(definition, title),
    );
    const relatedBullets = input.parsed.bulletGroups.filter((bullet) => matchesTopic(bullet, title));
    const relatedQuestions = input.parsed.questionCandidates.filter((question) =>
      matchesTopic(question, title),
    );
    const summarySource =
      structuredTopic?.whyItMatters ??
      structuredTopic?.keyIdeas[0] ??
      relatedDefinitions[0] ??
      relatedBullets[0] ??
      relatedQuestions[0] ??
      input.parsed.definitions[index] ??
      input.parsed.bulletGroups[index] ??
      `Core ideas, patterns, and likely exam reasoning for ${title}.`;

    return {
      title,
      summary: compressLine(summarySource, `Core ideas and reasoning for ${title}.`),
      detailedSummary: [
        structuredTopic?.whyItMatters,
        ...(structuredTopic?.keyIdeas ?? []).slice(0, 3),
        structuredTopic?.intuition,
        ...relatedDefinitions.slice(0, 1),
        ...relatedBullets.slice(0, 3),
        ...relatedQuestions.slice(0, 1),
      ]
        .filter((item): item is string => Boolean(item))
        .map((item) => item.replace(/^Q:\s*/i, "").replace(/^Question[:\s]*/i, "").trim())
        .join(" ")
        .trim() || `Review definitions, examples, tradeoffs, and likely exam reasoning related to ${title}.`,
      keyPoints: uniqueBy(
        [
          ...(structuredTopic?.keyIdeas ?? []).slice(0, 4),
          ...relatedBullets.slice(0, 4),
          ...relatedDefinitions.slice(0, 2),
        ].map((item) => compressLine(item, "")).filter(Boolean),
        (item) => item.toLowerCase(),
      ).slice(0, 5),
      commonMistakes: uniqueBy(
        [
          ...(structuredTopic?.commonMistakes ?? []).slice(0, 3),
          `Confusing ${title} with a nearby concept without comparing the constraints.`,
          `Memorizing ${title} without understanding how to apply it from context.`,
        ],
        (item) => item.toLowerCase(),
      ),
      formulas: [],
      sourceRefs: [],
      subtopics: [],
    } satisfies TopicInput;
  });
}

function buildFallbackQuestions(input: {
  workspaceName: string;
  parsed: ParsedContent;
  topics: TopicInput[];
  isCodingCourse: boolean;
  detectedLanguages: string[];
}) {
  const preferredLanguage = input.detectedLanguages[0];
  const implementationLabel = preferredLanguage ? `${preferredLanguage} code` : "code or pseudocode";

  const directQuestions: QuestionInput[] = [
    ...input.parsed.qaPairs.map((pair, index) =>
      makeQuestion({
        type: index % 2 === 0 ? "short_answer" : "explain",
        topic: findBestTopic(pair.question, input.topics),
        difficulty: index % 3 === 0 ? "hard" : "medium",
        questionText: pair.question,
        correctAnswer: pair.answer,
        explanation: "Pulled directly from the pasted source and kept as a grounded study check.",
      }),
    ),
    ...input.parsed.questionCandidates.map((questionText, index) =>
      makeQuestion({
        type: index % 2 === 0 ? "short_answer" : "explain",
        topic: findBestTopic(questionText, input.topics),
        difficulty: index % 3 === 0 ? "hard" : "medium",
        questionText,
        correctAnswer:
          input.parsed.qaPairs.find((pair) => pair.question.toLowerCase() === questionText.toLowerCase())
            ?.answer ??
          `A strong answer should define the concept, explain why it matters, and connect it back to the source context.`,
        explanation: "Derived from a detected question line in the pasted source.",
      }),
    ),
  ];

  const generatedQuestions = input.topics.flatMap((topic, topicIndex) =>
    buildTopicQuestionTemplates({
      topic,
      topicIndex,
      isCodingCourse: input.isCodingCourse,
      implementationLabel,
    }),
  );

  const questions = uniqueBy(
    [...directQuestions, ...generatedQuestions],
    (item) => `${item.type}:${item.topic}:${item.questionText.toLowerCase()}`,
  );

  if (questions.length >= 10) {
    return questions.slice(0, 14);
  }

  const topUpQuestions = input.topics.flatMap((topic, topicIndex) =>
    buildTopicTopUps({
      topic,
      topicIndex,
      isCodingCourse: input.isCodingCourse,
      implementationLabel,
    }),
  );

  return uniqueBy([...questions, ...topUpQuestions], (item) => `${item.type}:${item.topic}:${item.questionText.toLowerCase()}`).slice(0, 14);
}

function buildTopicQuestionTemplates(input: {
  topic: TopicInput;
  topicIndex: number;
  isCodingCourse: boolean;
  implementationLabel: string;
}) {
  const difficulty = input.topicIndex % 3 === 0 ? "hard" : input.topicIndex % 2 === 0 ? "medium" : "easy";

  return [
    makeQuestion({
      type: "short_answer",
      topic: input.topic.title,
      difficulty: "easy",
      questionText: input.isCodingCourse
        ? `In your own words, what does ${input.topic.title} do, and where would it show up in ${input.implementationLabel}?`
        : `In your own words, what is the key idea behind ${input.topic.title}?`,
      correctAnswer: input.topic.summary,
      explanation: `Checks basic understanding of ${input.topic.title} before moving into application.`,
    }),
    makeQuestion({
      type: input.isCodingCourse ? "explain" : "compare",
      topic: input.topic.title,
      difficulty,
      questionText: input.isCodingCourse
        ? `How would you apply ${input.topic.title} in a realistic ${input.implementationLabel} task, and what bug or edge case would you watch for?`
        : `Compare ${input.topic.title} to a nearby alternative or misconception. What tradeoff decides which one fits?`,
      correctAnswer: input.topic.detailedSummary || input.topic.summary,
      explanation: `Pushes ${input.topic.title} beyond definition-level recall.`,
    }),
  ];
}

function buildTopicTopUps(input: {
  topic: TopicInput;
  topicIndex: number;
  isCodingCourse: boolean;
  implementationLabel: string;
}) {
  return [
    makeQuestion({
      type: "teach_back",
      topic: input.topic.title,
      difficulty: input.topicIndex % 2 === 0 ? "medium" : "hard",
      questionText: input.isCodingCourse
        ? `Teach ${input.topic.title} to a classmate using a tiny ${input.implementationLabel} example and one trap to avoid.`
        : `Teach back ${input.topic.title} in your own words and include one trap a student should avoid.`,
      correctAnswer: input.topic.summary,
      explanation: `Uses a teach-back prompt to check whether ${input.topic.title} feels intuitive.`,
    }),
    makeQuestion({
      type: "true_false",
      topic: input.topic.title,
      difficulty: "medium",
      questionText: `True or false: ${input.topic.commonMistakes[0] ?? `A student can use ${input.topic.title} correctly without understanding its constraints.`} Explain your reasoning.`,
      correctAnswer: "False unless the source explicitly says otherwise; a strong answer should correct the misconception with grounded reasoning.",
      explanation: `Targets a common misunderstanding in ${input.topic.title}.`,
    }),
  ];
}

function makeQuestion(input: {
  type: QuestionInput["type"];
  topic: string;
  difficulty: QuestionInput["difficulty"];
  questionText: string;
  correctAnswer: string;
  explanation: string;
}) {
  return {
    type: input.type,
    topic: input.topic,
    subtopic: "",
    difficulty: input.difficulty,
    questionText: input.questionText.trim(),
    options: [],
    correctAnswer: input.correctAnswer.trim(),
    gradingRubric: [
      "Defines or frames the concept accurately.",
      "Uses source-grounded reasoning instead of vague memorization.",
      "Includes an application, comparison, or constraint when relevant.",
    ],
    explanation: input.explanation,
    sourceRefs: [],
    confidenceScore: 0.55,
    estimatedTimeSeconds:
      input.type === "teach_back" ? 140 : input.type === "explain" ? 110 : 80,
  } satisfies QuestionInput;
}

function findBestTopic(questionText: string, topics: TopicInput[]) {
  return topics.find((topic) => matchesTopic(questionText, topic.title))?.title ?? topics[0]?.title ?? "Core concepts";
}

function normalizeTopicTitle(value: string) {
  const cleaned = value
    .replace(/^#+\s*/, "")
    .replace(/^(q:|question[:\s]+)/i, "")
    .replace(/^(explain|compare|why|how|what|when|which|describe)\s+/i, "")
    .replace(/\?+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3 || cleaned.length > 80) {
    return "";
  }

  return cleaned;
}

function deriveTopicTitle(value: string) {
  const normalized = value
    .replace(/^#+\s*/, "")
    .replace(/^(q:|question[:\s]+)/i, "")
    .replace(/^(what is|what are|why does|why do|how does|how do|when should|when would|which|compare|explain|describe)\s+/i, "")
    .replace(/\?+$/, "")
    .split(/[.,:;-]/)[0]
    .trim();

  return normalized.split(/\s+/).slice(0, 8).join(" ");
}

function extractParagraphSeeds(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40)
    .map((paragraph) => paragraph.split(/[.?!]/)[0] ?? "")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .map((line) => line.split(/\s+/).slice(0, 6).join(" "))
    .filter((line) => line.length >= 8);
}

function matchesTopic(value: string, title: string) {
  const valueTokens = tokenize(value);
  const titleTokens = tokenize(title);
  return titleTokens.some((token) => valueTokens.includes(token));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 3);
}

function compressLine(value: string, fallback: string) {
  const normalized = value
    .replace(/^Q:\s*/i, "")
    .replace(/^A:\s*/i, "")
    .replace(/^Question[:\s]*/i, "")
    .replace(/^Answer[:\s]*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || fallback;
}

function summarizeSourceText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}
