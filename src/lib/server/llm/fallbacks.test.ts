import { describe, expect, it } from "vitest";

import { fallbackGrading } from "./fallbacks";

describe("fallbackGrading", () => {
  it("returns higher scores for answers that hit rubric points", () => {
    const graded = fallbackGrading({
      answer: "A balanced BST has logarithmic height, so search is O(log n).",
      correctAnswer: "Search is O(log n) because balance keeps the height logarithmic.",
      rubric: ["States O(log n).", "Connects the answer to logarithmic height."],
    });

    expect(graded.score).toBeGreaterThan(0.3);
    expect(["correct", "partial"]).toContain(graded.verdict);
  });
});
