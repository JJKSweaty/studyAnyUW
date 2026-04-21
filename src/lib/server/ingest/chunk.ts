import { estimateReadingSeconds } from "@/lib/utils";

export type ChunkResult = {
  text: string;
  pageLabel?: string;
  sectionPath?: string;
  tokenEstimate: number;
};

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, preferredSize = 900): ChunkResult[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: ChunkResult[] = [];
  let buffer = "";
  let sectionPath = "";

  const flush = () => {
    if (!buffer.trim()) {
      return;
    }
    chunks.push({
      text: buffer.trim(),
      sectionPath,
      tokenEstimate: estimateTokens(buffer),
    });
    buffer = "";
  };

  paragraphs.forEach((paragraph) => {
    const headingMatch = paragraph.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      flush();
      sectionPath = headingMatch[1].trim();
      buffer = paragraph;
      return;
    }

    const nextValue = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (estimateTokens(nextValue) > preferredSize && buffer) {
      flush();
      buffer = paragraph;
      return;
    }

    buffer = nextValue;
  });

  flush();

  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      text: text.trim(),
      tokenEstimate: estimateReadingSeconds(text),
    });
  }

  return chunks;
}
