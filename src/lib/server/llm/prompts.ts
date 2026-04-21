export const topicExtractionSystemPrompt = `
You are a study content synthesizer.
Turn raw course material into a topic pack for a study tool.
Prioritize conceptual understanding, active recall, edge cases, compare/contrast, and source-grounded explanations.
Do not invent source references. If uncertain, leave sourceRefs empty.
`;

export function buildTopicExtractionPrompt(input: {
  workspaceName: string;
  parsedSignals: {
    headings: string[];
    definitions: string[];
    questionCandidates: string[];
    qaPairs: Array<{ question: string; answer: string }>;
  };
  sourcePreview: string;
}) {
  return `
Create a study pack for the workspace "${input.workspaceName}".

Output JSON with fields:
- courseSummary
- conciseSummary
- keyDefinitions
- likelyExamQuestions
- topics: [{ title, summary, detailedSummary, keyPoints, commonMistakes, formulas, sourceRefs, subtopics }]
- flashcards: [{ topic, front, back, sourceRefs }]
- questions: [{ type, topic, subtopic, difficulty, questionText, options, correctAnswer, gradingRubric, explanation, sourceRefs, confidenceScore, estimatedTimeSeconds }]

Rules:
- Generate between 4 and 8 topics.
- Generate between 10 and 20 questions.
- Favor short_answer, explain, compare, mcq, true_false, and teach_back.
- Avoid duplicates and trivial paraphrases.
- For MCQ, include 4 options.
- Make questions useful for real exam prep.
- Keep explanations concise and grounded in the source preview.

Detected headings:
${input.parsedSignals.headings.map((item) => `- ${item}`).join("\n")}

Definitions:
${input.parsedSignals.definitions.map((item) => `- ${item}`).join("\n")}

Question candidates:
${input.parsedSignals.questionCandidates.map((item) => `- ${item}`).join("\n")}

Existing Q/A pairs:
${input.parsedSignals.qaPairs.map((item) => `- Q: ${item.question}\n  A: ${item.answer}`).join("\n")}

Source preview:
${input.sourcePreview}
`;
}

export function buildGradingPrompt(input: {
  questionText: string;
  correctAnswer: string;
  rubric: string[];
  userAnswer: string;
  sourceContext: string;
  strictness: "lenient" | "balanced" | "strict";
}) {
  return `
Grade the student's answer for a study app.

Return JSON with:
- score [0..1]
- correctness [0..1]
- completeness [0..1]
- clarity [0..1]
- verdict: correct | partial | incorrect
- missingPoints: string[]
- strengths: string[]
- conciseFeedback
- improvedAnswer
- groundedAnswer

Strictness: ${input.strictness}

Question:
${input.questionText}

Expected answer:
${input.correctAnswer}

Rubric:
${input.rubric.map((item) => `- ${item}`).join("\n")}

Student answer:
${input.userAnswer}

Source context:
${input.sourceContext}
`;
}
