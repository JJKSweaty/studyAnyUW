import { describe, expect, it } from "vitest";

import { questionSchema } from "./schemas";

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
