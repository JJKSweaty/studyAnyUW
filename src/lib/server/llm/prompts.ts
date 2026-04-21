export const topicExtractionSystemPrompt = `
You are a study content synthesizer.
Turn raw course material into a topic pack for a study tool.
Prioritize conceptual understanding, active recall, edge cases, compare/contrast, and source-grounded explanations.
Do not invent source references. If uncertain, leave sourceRefs empty.
`;

export const focusedQuestionSystemPrompt = `
You are a study coach creating targeted extra practice for weak concepts.
Sequence questions from intuition-building to applied exam-style checks.
Prioritize conceptual clarity, grounded explanations, and relatable examples.
Do not invent source references. If uncertain, leave sourceRefs empty.
`;

export function buildTopicExtractionPrompt(input: {
  workspaceName: string;
  workspaceDescription?: string;
  courseName?: string;
  courseCode?: string;
  tags?: string[];
  studyContextSummary?: string;
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
- If the material is coding-oriented, include a real mix of conceptual and application-based coding questions.
- For coding-oriented questions, use the dominant detected language when it is clear; otherwise use pseudocode sparingly.
- For coding-oriented answers, explanations, and rubrics, emphasize logic, correctness, edge cases, debugging, and complexity or tradeoffs when relevant.

Course metadata:
- Course: ${input.courseCode ? `${input.courseCode} ` : ""}${input.courseName ?? "Unknown"}
- Workspace: ${input.workspaceName}
- Workspace description: ${input.workspaceDescription || "None"}
- Tags:
${input.tags?.length ? input.tags.map((item) => `  - ${item}`).join("\n") : "  - None"}

Study context:
${input.studyContextSummary ?? "No special study context detected."}

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
  studyContextSummary?: string;
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
Study context: ${input.studyContextSummary ?? "General study material."}

If this is a coding answer, grade for:
- logical correctness
- handling of edge cases
- quality of reasoning and debugging approach
- language-appropriate structure and syntax when code is supplied
- complexity or tradeoff awareness when relevant

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

export function buildFocusedQuestionPrompt(input: {
  workspaceName: string;
  topicTitle: string;
  topicSummary: string;
  commonMistakes: string[];
  struggleNote?: string;
  existingQuestions: string[];
  sourceContext: string;
  studyContextSummary?: string;
}) {
  return `
Create a focused remedial drill for the workspace "${input.workspaceName}" on the topic "${input.topicTitle}".

Return JSON with fields:
- overview
- questions: [{ type, topic, subtopic, difficulty, questionText, options, correctAnswer, gradingRubric, explanation, sourceRefs, confidenceScore, estimatedTimeSeconds }]

Rules:
- Generate 6 questions.
- Use "${input.topicTitle}" as the topic field for every question.
- Start with easy or medium intuition-building prompts before moving to application or comparison.
- Favor short_answer, explain, compare, mcq, and true_false.
- Avoid duplicates or light rewrites of the existing questions.
- For MCQ, include exactly 4 options.
- Keep explanations concise and practical.
- Use relatable examples when they help clarify the concept.
- If this topic is coding-oriented, include debugging, tracing, application, and implementation prompts using the likely language when it is clear.

Study context:
${input.studyContextSummary ?? "No special study context detected."}

Topic summary:
${input.topicSummary}

Common mistakes:
${input.commonMistakes.map((item) => `- ${item}`).join("\n") || "- None provided"}

Why the learner is struggling:
${input.struggleNote?.trim() || "No extra struggle note was provided."}

Existing questions to avoid duplicating:
${input.existingQuestions.map((item) => `- ${item}`).join("\n") || "- None"}

Source context:
${input.sourceContext}
`;
}
