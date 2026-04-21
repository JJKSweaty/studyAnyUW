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
});
