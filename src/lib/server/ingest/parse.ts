import { uniqueBy } from "@/lib/utils";

export type ParsedContent = {
  headings: string[];
  definitions: string[];
  bulletGroups: string[];
  questionCandidates: string[];
  qaPairs: Array<{ question: string; answer: string }>;
};

function cleanLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseStudyText(text: string): ParsedContent {
  const lines = cleanLines(text);
  const headings = uniqueBy(
    lines
      .filter((line) => /^#{1,4}\s+/.test(line) || /^[A-Z][A-Za-z0-9 ,:/()'-]{4,80}$/.test(line))
      .map((line) => line.replace(/^#{1,4}\s+/, "").trim()),
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
      .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")),
    (item) => item.toLowerCase(),
  ).slice(0, 40);

  const questionCandidates = uniqueBy(
    lines
      .filter(
        (line) =>
          /\?$/.test(line) ||
          /^(explain|compare|why|how|what|when|which|true or false)/i.test(line),
      )
      .map((line) => line.trim()),
    (item) => item.toLowerCase(),
  ).slice(0, 32);

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
    headings,
    definitions,
    bulletGroups,
    questionCandidates,
    qaPairs,
  };
}
