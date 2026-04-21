import { createStudySession, getMistakes, getQuestionsForWorkspace } from "./repository";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function startSessionForWorkspace(input: {
  workspaceId: string;
  mode:
    | "quick_drill"
    | "weak_topics"
    | "mixed_review"
    | "exam_simulation"
    | "flashcard_review"
    | "teach_back";
}) {
  const allQuestions = getQuestionsForWorkspace(input.workspaceId);
  const mistakes = getMistakes(input.workspaceId);

  let selected = allQuestions;

  if (input.mode === "quick_drill") {
    selected = shuffle(allQuestions).slice(0, 10);
  }

  if (input.mode === "weak_topics") {
    const weakTopicTitles = new Set(mistakes.map((item) => item.topicTitle));
    selected = allQuestions.filter((question) => weakTopicTitles.has(question.topicTitle));
  }

  if (input.mode === "mixed_review") {
    selected = shuffle(
      allQuestions.filter((question) =>
        ["short_answer", "mcq", "true_false", "compare"].includes(question.type),
      ),
    ).slice(0, 12);
  }

  if (input.mode === "exam_simulation") {
    selected = shuffle(allQuestions).slice(0, 20);
  }

  if (input.mode === "flashcard_review") {
    selected = shuffle(allQuestions.filter((question) => question.type === "flashcard")).slice(0, 16);
  }

  if (input.mode === "teach_back") {
    selected = shuffle(
      allQuestions.filter((question) => ["teach_back", "explain"].includes(question.type)),
    ).slice(0, 8);
  }

  if (selected.length === 0) {
    selected = shuffle(allQuestions).slice(0, 10);
  }

  if (selected.length === 0) {
    throw new Error("No questions available in this workspace yet.");
  }

  const sessionId = createStudySession({
    workspaceId: input.workspaceId,
    mode: input.mode,
    questionIds: selected.map((question) => question.id),
    metadata: {
      targetCount: selected.length,
    },
  });

  return sessionId;
}
