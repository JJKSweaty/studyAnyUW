import { describeStudyContext, inferStudyContext } from "./server/study-context";

type PromptSource = {
  title: string;
  kind: string;
  sourceType: string;
  stats?: Record<string, number | string>;
};

export function buildExternalStudyPrompt(input: {
  workspaceName: string;
  courseName: string;
  courseCode: string;
  workspaceDescription?: string;
  conciseSummary?: string;
  tags?: string[];
  focusNote?: string;
  workspaceSources: PromptSource[];
  sharedSources: PromptSource[];
}) {
  const studyContext = inferStudyContext({
    workspaceName: input.workspaceName,
    workspaceDescription: input.workspaceDescription,
    courseName: input.courseName,
    courseCode: input.courseCode,
    tags: input.tags,
    text: [
      input.conciseSummary,
      input.workspaceDescription,
      ...input.workspaceSources.map((source) => `${source.title} ${source.kind}`),
      ...input.sharedSources.map((source) => `${source.title} ${source.kind}`),
    ]
      .filter(Boolean)
      .join("\n"),
  });
  const workspaceInventory = formatSourceInventory(input.workspaceSources, "Workspace source");
  const sharedInventory = formatSourceInventory(input.sharedSources, "Shared course source");

  return `You are helping me build a high-signal study pack for ${input.courseCode} ${input.courseName}, workspace "${input.workspaceName}".

Goal:
- Turn the attached files, pasted notes, screenshots, and source excerpts into a study pack that improves intuition, recall, and exam performance.
- Keep the output grounded in the actual study material.
- Prioritize detailed topic breakdowns, misconception checks, and practice questions with answers.

Output requirements:
- Use clean Markdown only.
- Do not use tables.
- Use clear headings so the notes can be imported into another study app.
- For definitions, use the format "Term: definition".
- For practice items, always place each question and answer on consecutive lines using:
Q: ...
A: ...
- After each Q/A pair, you may add optional bullets for topic, difficulty, or why it matters.
- Include easy, medium, and hard questions.
- Include a mix of explain, compare, short-answer, and applied questions.
- Include intuition builders for concepts students usually struggle with.
- Include common mistakes and how to catch them.
- Keep explanations detailed enough to study from, but not bloated.
- If this appears to be a coding course, include application-based coding questions, debugging/tracing prompts, and short code-writing tasks in the dominant language when it is clear.

Preferred structure:
# Course Snapshot
- What this material is mainly about
- What the student must really understand, not just memorize

# Topic Map
## Topic Name
- Why it matters
- Key ideas
- Intuition / mental model
- Common mistakes
- If relevant, formulas, steps, or decision rules

# Definitions
Term: definition

# Practice Questions
Q: ...
A: ...

# Weak Spot Drills
Q: ...
A: ...

# Fast Review Checklist
- ...

Grounding requirements:
- Only use information supported by the provided sources.
- If the sources disagree or feel incomplete, say so briefly instead of guessing.
- If a file title is useful context, reference it naturally in the explanation.

Student focus:
${input.focusNote?.trim() || "No extra focus note was supplied. Default to balanced exam prep with intuition and active recall."}

Study context:
${describeStudyContext(studyContext)}

Current workspace summary:
${input.conciseSummary?.trim() || "No summary exists yet."}

Workspace tags:
${input.tags?.length ? input.tags.map((tag) => `- ${tag}`).join("\n") : "- None"}

Current workspace source inventory:
${workspaceInventory}

Shared course context inventory:
${sharedInventory}

Important:
- If I attach files or paste source excerpts after this prompt, treat them as the primary evidence.
- If some listed sources are not attached in the chat, do not invent details from them.
- Optimize for a result that I can paste back into a study app and immediately turn into topics and question banks.`;
}

function formatSourceInventory(sources: PromptSource[], label: string) {
  if (sources.length === 0) {
    return `- No ${label.toLowerCase()}s added yet.`;
  }

  return sources
    .map((source) => {
      const details = [source.kind, source.sourceType, formatStats(source.stats)].filter(Boolean).join(" | ");
      return `- ${label}: ${source.title}${details ? ` (${details})` : ""}`;
    })
    .join("\n");
}

function formatStats(stats?: Record<string, number | string>) {
  if (!stats) {
    return "";
  }

  const preferred = ["pages", "characters", "chunks", "images"];
  const summary = preferred
    .filter((key) => key in stats)
    .map((key) => `${key}: ${String(stats[key])}`);

  return summary.slice(0, 2).join(", ");
}
