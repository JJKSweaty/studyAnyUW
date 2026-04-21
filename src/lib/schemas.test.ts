import { describe, expect, it } from "vitest";

import { questionSchema, topicPackSchema } from "./schemas";

describe("questionSchema", () => {
  it("validates a structured question object", () => {
    const result = questionSchema.parse({
      type: "short_answer",
      topic: "Balanced BSTs",
      subtopic: "",
      difficulty: "medium",
      questionText: "Why is search logarithmic in a balanced BST?",
      options: [],
      correctAnswer: "Because the height remains logarithmic.",
      gradingRubric: ["States O(log n).", "References height."],
      explanation: "Checks whether the student understands tree height.",
      sourceRefs: [],
      confidenceScore: 0.7,
      estimatedTimeSeconds: 75,
    });

    expect(result.type).toBe("short_answer");
    expect(result.difficulty).toBe("medium");
  });
});

describe("topicPackSchema", () => {
  it("rejects undersized question sets", () => {
    expect(() =>
      topicPackSchema.parse({
        courseSummary: "A course summary long enough to satisfy validation.",
        conciseSummary: "A concise summary long enough to satisfy validation.",
        keyDefinitions: [],
        likelyExamQuestions: [],
        topics: [
          {
            title: "Balanced BSTs",
            summary: "Balanced trees keep height low.",
            detailedSummary: "Balanced trees keep search efficient by controlling height.",
            keyPoints: [],
            commonMistakes: [],
            formulas: [],
            sourceRefs: [],
            subtopics: [],
          },
        ],
        flashcards: [],
        questions: Array.from({ length: 2 }).map((_, index) => ({
          type: "short_answer",
          topic: "Balanced BSTs",
          subtopic: "",
          difficulty: "medium",
          questionText: `Question ${index} about balanced BSTs?`,
          options: [],
          correctAnswer: "A correct answer.",
          gradingRubric: ["Mentions the key idea."],
          explanation: "Checks understanding of the concept.",
          sourceRefs: [],
          confidenceScore: 0.7,
          estimatedTimeSeconds: 75,
        })),
      }),
    ).toThrow();
  });
});
