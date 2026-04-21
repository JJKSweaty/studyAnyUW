import { uniqueBy } from "@/lib/utils";

const sectionLabels = [
  "Course Snapshot",
  "Topic Map",
  "Definitions",
  "Practice Questions",
  "Weak Spot Drills",
  "Fast Review Checklist",
];

const fieldLabels = [
  "Why it matters:",
  "Key ideas:",
  "Intuition / mental model:",
  "Common mistakes:",
  "Topic:",
  "Difficulty:",
  "Q:",
  "A:",
  "Question:",
  "Answer:",
];

const genericHeadingBlocklist = new Set(sectionLabels.map((label) => label.toLowerCase()));

export type ParsedStructuredTopic = {
  title: string;
  whyItMatters: string;
  keyIdeas: string[];
  intuition: string;
  commonMistakes: string[];
};

export type ParsedContent = {
  normalizedText: string;
  headings: string[];
  definitions: string[];
  bulletGroups: string[];
  questionCandidates: string[];
  qaPairs: Array<{ question: string; answer: string }>;
  structuredTopics: ParsedStructuredTopic[];
};

function cleanLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeStudyText(text: string) {
  let normalized = text.replace(/\r\n?/g, "\n");

  sectionLabels.forEach((label) => {
    normalized = normalized.replace(new RegExp(`\\s*${escapeRegExp(label)}\\s*`, "g"), `\n${label}\n`);
  });

  fieldLabels.forEach((label) => {
    normalized = normalized.replace(new RegExp(`\\s*${escapeRegExp(label)}\\s*`, "g"), `\n${label} `);
  });

  normalized = normalized
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();

  return normalized;
}

export function parseStudyText(text: string): ParsedContent {
  const normalizedText = normalizeStudyText(text);
  const lines = cleanLines(normalizedText);
  const headings = uniqueBy(
    lines
      .filter((line) => /^#{1,4}\s+/.test(line) || /^[A-Z][A-Za-z0-9 ,:/()&'-]{3,80}$/.test(line))
      .map((line) => line.replace(/^#{1,4}\s+/, "").trim())
      .filter((line) => !genericHeadingBlocklist.has(line.toLowerCase())),
    (item) => item.toLowerCase(),
  ).slice(0, 24);

  const definitions = uniqueBy(
    lines
      .filter((line) => /^[A-Za-z][A-Za-z0-9 ()/-]{2,40}:\s+.{8,}/.test(line))
      .map((line) => line.trim()),
    (item) => item.toLowerCase(),
  ).slice(0, 24);

  const bulletGroups = uniqueBy(
    lines
      .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^\[\s?\]\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/^\[\s?\]\s+/, "")),
    (item) => item.toLowerCase(),
  ).slice(0, 48);

  const questionCandidates = uniqueBy(
    lines
      .filter(
        (line) =>
          /\?$/.test(line) ||
          /^(q:|question[:\s]|explain|compare|why|how|what|when|which|true or false)/i.test(line),
      )
      .map((line) => line.replace(/^(q:|question[:\s]+)/i, "").trim()),
    (item) => item.toLowerCase(),
  ).slice(0, 40);

  const qaPairs: Array<{ question: string; answer: string }> = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    if (/^(q:|question[:\s])/i.test(current) && /^(a:|answer[:\s])/i.test(next)) {
      qaPairs.push({
        question: current.replace(/^(q:|question[:\s]+)/i, "").trim(),
        answer: next.replace(/^(a:|answer[:\s]+)/i, "").trim(),
      });
    }
  }

  return {
    normalizedText,
    headings,
    definitions,
    bulletGroups,
    questionCandidates,
    qaPairs,
    structuredTopics: extractStructuredTopics(lines),
  };
}

function extractStructuredTopics(lines: string[]) {
  const topics: ParsedStructuredTopic[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] ?? "";

    if (
      !line ||
      genericHeadingBlocklist.has(line.toLowerCase()) ||
      /^(q:|a:|question[:\s]|answer[:\s]|topic:|difficulty:)/i.test(line) ||
      /:$/.test(line) ||
      !/^[A-Z]/.test(line) ||
      !/^Why it matters:/i.test(next)
    ) {
      continue;
    }

    const topic: ParsedStructuredTopic = {
      title: line,
      whyItMatters: "",
      keyIdeas: [],
      intuition: "",
      commonMistakes: [],
    };

    let cursor = index + 1;
    while (cursor < lines.length) {
      const current = lines[cursor];

      if (!current) {
        cursor += 1;
        continue;
      }

      if (
        cursor !== index + 1 &&
        /^[A-Z]/.test(current) &&
        !/:$/.test(current) &&
        !genericHeadingBlocklist.has(current.toLowerCase()) &&
        /^Why it matters:/i.test(lines[cursor + 1] ?? "")
      ) {
        break;
      }

      if (genericHeadingBlocklist.has(current.toLowerCase()) || /^(definitions|practice questions|weak spot drills|fast review checklist)$/i.test(current)) {
        break;
      }

      if (/^Why it matters:/i.test(current)) {
        topic.whyItMatters = current.replace(/^Why it matters:\s*/i, "").trim();
      } else if (/^Key ideas:/i.test(current)) {
        topic.keyIdeas.push(current.replace(/^Key ideas:\s*/i, "").trim());
      } else if (/^Intuition \/ mental model:/i.test(current)) {
        topic.intuition = current.replace(/^Intuition \/ mental model:\s*/i, "").trim();
      } else if (/^Common mistakes:/i.test(current)) {
        topic.commonMistakes.push(current.replace(/^Common mistakes:\s*/i, "").trim());
      } else if (!/^(topic:|difficulty:|q:|a:|question[:\s]|answer[:\s])/i.test(current)) {
        if (topic.commonMistakes.length > 0) {
          topic.commonMistakes.push(current);
        } else if (topic.intuition) {
          topic.intuition = `${topic.intuition} ${current}`.trim();
        } else if (topic.keyIdeas.length > 0) {
          topic.keyIdeas.push(current);
        } else if (topic.whyItMatters) {
          topic.whyItMatters = `${topic.whyItMatters} ${current}`.trim();
        }
      }

      cursor += 1;
    }

    if (topic.whyItMatters || topic.keyIdeas.length > 0 || topic.intuition) {
      topics.push({
        ...topic,
        keyIdeas: uniqueBy(
          topic.keyIdeas.map((item) => item.trim()).filter(Boolean),
          (item) => item.toLowerCase(),
        ).slice(0, 6),
        commonMistakes: uniqueBy(
          topic.commonMistakes.map((item) => item.trim()).filter(Boolean),
          (item) => item.toLowerCase(),
        ).slice(0, 4),
      });
      index = Math.max(index, cursor - 1);
    }
  }

  return uniqueBy(topics, (topic) => topic.title.toLowerCase()).slice(0, 8);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
