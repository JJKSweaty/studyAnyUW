import { describe, expect, it } from "vitest";

import { parseStudyText } from "./parse";

describe("parseStudyText", () => {
  it("extracts headings, definitions, and qa pairs", () => {
    const parsed = parseStudyText(`
      # Trees
      BST: A binary search tree maintains an ordering invariant.
      - Search follows the ordering property.
      Question: Why can a BST degrade?
      Answer: Because insertion order can produce a chain.
    `);

    expect(parsed.headings).toContain("Trees");
    expect(parsed.definitions[0]).toContain("BST:");
    expect(parsed.qaPairs[0]?.question).toContain("Why can a BST degrade?");
  });

  it("normalizes pasted study-pack sections into structured topics", () => {
    const parsed = parseStudyText(`
      Course SnapshotWhat this material is mainly about: Sorting and graph algorithms.
      Topic MapHash Tables & MapsWhy it matters: Fast lookup for maps and sets.
      Key ideas: Rehashing keeps load factor manageable.
      Intuition / mental model: Compute an index from the key.
      Common mistakes: Copying buckets directly during rehashing.
      Sorting AlgorithmsWhy it matters: Sorting supports faster downstream queries.
      Key ideas: Quick sort averages O(N log N) but can degrade to O(N^2).
      Q: Why can quick sort degrade badly?
      A: Poor pivot choices can create highly unbalanced partitions.
    `);

    expect(parsed.structuredTopics.some((topic) => topic.title === "Hash Tables & Maps")).toBe(true);
    expect(parsed.structuredTopics.some((topic) => topic.title === "Sorting Algorithms")).toBe(true);
    expect(parsed.qaPairs[0]?.question).toContain("Why can quick sort degrade badly?");
    expect(parsed.questionBlocks[0]?.topicHint).toBe("");
  });

  it("captures topic and difficulty metadata attached to pasted questions", () => {
    const parsed = parseStudyText(`
      Practice Questions
      Q: What data structure powers BFS?
      A: A queue.
      Topic: Graph Search
      Difficulty: Easy
    `);

    expect(parsed.questionBlocks[0]?.question).toContain("What data structure powers BFS?");
    expect(parsed.questionBlocks[0]?.topicHint).toBe("Graph Search");
    expect(parsed.questionBlocks[0]?.difficultyHint).toBe("easy");
  });
});
