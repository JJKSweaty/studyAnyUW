export type StudyContext = {
  isCodingCourse: boolean;
  detectedLanguages: string[];
  signals: string[];
};

const languageDetectors = [
  {
    id: "typescript",
    patterns: [/```typescript/i, /\btypescript\b/i, /\binterface\s+\w+/i, /:\s*(string|number|boolean)\b/i, /\.tsx?\b/i],
  },
  {
    id: "javascript",
    patterns: [/```javascript/i, /\bjavascript\b/i, /\bconsole\.log\(/i, /\bfunction\s+\w+\(/i, /\.jsx?\b/i],
  },
  {
    id: "python",
    patterns: [/```python/i, /\bpython\b/i, /^\s*def\s+\w+\(/im, /\bimport\s+\w+/i, /\.py\b/i],
  },
  {
    id: "java",
    patterns: [/```java/i, /\bjava\b/i, /\bpublic\s+class\s+\w+/i, /\bSystem\.out\.println/i, /\.java\b/i],
  },
  {
    id: "c++",
    patterns: [/```cpp/i, /```c\+\+/i, /\bc\+\+\b/i, /#include\s*<\w+>/i, /\bstd::\w+/i, /\.(cpp|cc|hpp|h)\b/i],
  },
  {
    id: "c",
    patterns: [/```c/i, /\bc language\b/i, /\bprintf\(/i, /\bscanf\(/i, /\.(c|h)\b/i],
  },
  {
    id: "c#",
    patterns: [/```c#/i, /```csharp/i, /\bc#\b/i, /\bnamespace\s+\w+/i, /\bConsole\.WriteLine/i, /\.cs\b/i],
  },
  {
    id: "go",
    patterns: [/```go/i, /\bgolang\b/i, /\bpackage\s+main\b/i, /\bfmt\.Println/i, /\.go\b/i],
  },
  {
    id: "rust",
    patterns: [/```rust/i, /\brust\b/i, /\bfn\s+main\(/i, /\blet\s+mut\s+\w+/i, /\.rs\b/i],
  },
  {
    id: "sql",
    patterns: [/```sql/i, /\bsql\b/i, /\bselect\b[\s\S]{0,40}\bfrom\b/i, /\bjoin\b/i, /\.(sql|db)\b/i],
  },
  {
    id: "html",
    patterns: [/```html/i, /\bhtml\b/i, /<div[\s>]/i, /<html[\s>]/i, /\.html?\b/i],
  },
  {
    id: "css",
    patterns: [/```css/i, /\bcss\b/i, /[.#][a-z0-9_-]+\s*\{/i, /\bdisplay:\s*(flex|grid|block)/i, /\.css\b/i],
  },
];

const codingCoursePatterns = [
  /\bcoding\b/i,
  /\bprogramming\b/i,
  /\bsoftware\b/i,
  /\bcomputer science\b/i,
  /\bdata structures?\b/i,
  /\balgorithms?\b/i,
  /\bweb development\b/i,
  /\bobject-oriented\b/i,
  /\breact\b/i,
  /\bnode\b/i,
  /\bdatabase\b/i,
  /\boperating systems?\b/i,
  /\bcompiler\b/i,
  /\bdebug/i,
];

export function inferStudyContext(input: {
  workspaceName?: string;
  workspaceDescription?: string;
  courseName?: string;
  courseCode?: string;
  tags?: string[];
  text?: string;
}) {
  const metadata = [
    input.workspaceName,
    input.workspaceDescription,
    input.courseName,
    input.courseCode,
    ...(input.tags ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  const textSample = input.text?.slice(0, 12000) ?? "";
  const combined = `${metadata}\n${textSample}`;

  let codingScore = 0;
  const signals: string[] = [];

  codingCoursePatterns.forEach((pattern) => {
    if (pattern.test(combined)) {
      codingScore += 2;
      signals.push(`Matched coding cue: ${pattern}`);
    }
  });

  if (/```[\w#+-]*/.test(textSample)) {
    codingScore += 3;
    signals.push("Detected fenced code blocks.");
  }

  if (/[{}();]/.test(textSample) && /==|=>|def\s+\w+\(|public\s+class|SELECT\b/i.test(textSample)) {
    codingScore += 3;
    signals.push("Detected source-like programming syntax.");
  }

  const languageMatches = languageDetectors
    .map((language) => ({
      id: language.id,
      score: language.patterns.reduce((total, pattern) => total + (pattern.test(combined) ? 1 : 0), 0),
    }))
    .filter((language) => language.score > 0)
    .sort((left, right) => right.score - left.score);

  if (languageMatches.length > 0) {
    codingScore += languageMatches[0].score + Math.min(2, languageMatches.length - 1);
  }

  const detectedLanguages = languageMatches
    .filter((language, index) => language.score >= 2 || index === 0)
    .slice(0, 3)
    .map((language) => language.id);

  if (detectedLanguages.length > 0) {
    signals.push(`Detected likely language(s): ${detectedLanguages.join(", ")}.`);
  }

  return {
    isCodingCourse: codingScore >= 4 || detectedLanguages.length > 0,
    detectedLanguages,
    signals,
  } satisfies StudyContext;
}

export function describeStudyContext(context: StudyContext) {
  if (!context.isCodingCourse) {
    return "General study material. Prioritize conceptual understanding, active recall, and source-grounded questions.";
  }

  return [
    "Coding-oriented study material.",
    context.detectedLanguages.length > 0
      ? `Likely language(s): ${context.detectedLanguages.join(", ")}.`
      : "No single language is dominant; use concise pseudocode when necessary.",
    "Favor application-based coding prompts, debugging, tracing, output prediction, edge cases, and implementation tradeoffs.",
  ].join(" ");
}
