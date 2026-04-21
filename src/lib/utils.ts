import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function humanAgo(value: string | Date) {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
  });
}

export function estimateReadingSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(20, Math.round((words / 180) * 60));
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function uniqueBy<T>(items: T[], selector: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = selector(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function average(numbers: number[]) {
  if (numbers.length === 0) {
    return 0;
  }
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

export function chunkArray<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}
