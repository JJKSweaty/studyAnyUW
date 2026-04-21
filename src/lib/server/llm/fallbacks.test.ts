import { describe, expect, it } from "vitest";

import { parseStudyText } from "../ingest/parse";

import { fallbackGrading, fallbackTopicPack } from "./fallbacks";

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

describe("fallbackTopicPack", () => {
  it("builds a fuller question bank from pasted context instead of only detected questions", () => {
    const text = `
      # Recursion
      Recursion: A function solves a problem by calling itself on a smaller subproblem.
      - Every recursive solution needs a base case and a recursive step.
      - Stack growth and repeated work are common concerns.

      # Memoization
      Memoization: Cache repeated subproblems so recursion avoids duplicate work.
      - It often improves exponential recursion to polynomial time.

      Q: Why does recursion need a base case?
      A: Without a base case, the calls do not stop and the program overflows the call stack.

      Q: How does memoization help recursive algorithms?
      A: It stores results for repeated subproblems, avoiding duplicate computation.
    `;

    const pack = fallbackTopicPack({
      workspaceName: "Recursion Review",
      parsed: parseStudyText(text),
      text,
    });

    expect(pack.questions.length).toBeGreaterThanOrEqual(10);
    expect(pack.topics.length).toBeGreaterThanOrEqual(2);
    expect(pack.questions.some((question) => /memoization/i.test(question.questionText))).toBe(true);
  });

  it("uses structured topic-map sections instead of turning container labels into topics", () => {
    const text = `
      Course SnapshotWhat this material is mainly about: Data structures and graph algorithms.
      Topic MapHash Tables & MapsWhy it matters: Fast lookup for sets and maps.
      Key ideas: Rehashing happens when the load factor gets too high.
      Intuition / mental model: Compute a slot from the key.
      Common mistakes: Copying old buckets directly after resizing.

      Sorting AlgorithmsWhy it matters: Sorting improves search and selection workflows.
      Key ideas: Quick sort averages O(N log N) but can degrade to O(N^2).
      Intuition / mental model: Partition first, recurse after.
      Common mistakes: Assuming heap sort is always best in practice.

      Practice Questions
      Q: Why does rehashing require reinserting elements?
      A: The table size changes, so the hash-to-index mapping changes too.
    `;

    const pack = fallbackTopicPack({
      workspaceName: "Algo Review",
      parsed: parseStudyText(text),
      text,
    });

    expect(pack.topics.some((topic) => topic.title === "Hash Tables & Maps")).toBe(true);
    expect(pack.topics.some((topic) => topic.title === "Sorting Algorithms")).toBe(true);
    expect(pack.topics.some((topic) => /Course Snapshot/i.test(topic.title))).toBe(false);
  });
});
