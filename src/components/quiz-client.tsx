"use client";

import { useMutation } from "@tanstack/react-query";
import { Clock3, GaugeCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { humanAgo } from "@/lib/utils";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";

type SessionShape = {
  id: string;
  workspaceId: string;
  status: string;
  questions: Array<{
    id: string;
    topicTitle: string;
    subtopic: string;
    type: string;
    difficulty: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    gradingRubric: string[];
    explanation: string;
    sourceRefs: Array<Record<string, string>>;
    estimatedTimeSeconds: number;
  }>;
  responses: Array<{
    questionId: string;
    score: number;
    gradingFeedback: {
      verdict: string;
      conciseFeedback: string;
      missingPoints: string[];
      improvedAnswer: string;
    };
  }>;
  startedAt: string;
};

export function QuizClient({ session }: { session: SessionShape }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(0.5);
  const startedAtRef = useRef<number | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, SessionShape["responses"][number]>>(
    Object.fromEntries(session.responses.map((response) => [response.questionId, response])),
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const currentQuestion = session.questions[index];
  const currentResponse = submitted[currentQuestion?.id];
  const progress = ((index + (currentResponse ? 1 : 0)) / Math.max(1, session.questions.length)) * 100;

  const submitMutation = useMutation({
    mutationFn: async (complete: boolean) => {
      const response = await fetch(`/api/sessions/${session.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          complete
            ? { complete: true }
            : {
                questionId: currentQuestion.id,
                answer,
                confidence,
                timeSeconds: Math.floor(
                  (Date.now() - (startedAtRef.current ?? Date.now())) / 1000,
                ),
              },
        ),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Submission failed.");
      }

      return (await response.json()) as {
        grading?: SessionShape["responses"][number]["gradingFeedback"] & { score: number };
        score?: number;
      };
    },
    onSuccess: (data) => {
      if (data.grading) {
        const grading = data.grading;
        const gradingFeedback = {
          verdict: grading.verdict,
          conciseFeedback: grading.conciseFeedback,
          missingPoints: grading.missingPoints,
          improvedAnswer: grading.improvedAnswer,
        };

        setSubmitted((current) => ({
          ...current,
          [currentQuestion.id]: {
            questionId: currentQuestion.id,
            score: grading.score,
            gradingFeedback,
          },
        }));
        toast.success("Answer graded.");
      } else {
        toast.success("Session completed.");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Submission failed.");
    },
  });

  const isLast = index === session.questions.length - 1;
  const answeredCount = useMemo(() => Object.keys(submitted).length, [submitted]);

  if (!currentQuestion) {
    return (
      <Card>
        <h3 className="text-lg font-semibold">Session complete</h3>
        <p className="mt-2 text-sm text-zinc-400">
          {answeredCount} question(s) submitted. Started {humanAgo(session.startedAt)}.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.7fr_0.3fr]">
      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{currentQuestion.topicTitle}</Badge>
            <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{currentQuestion.type}</Badge>
            <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{currentQuestion.difficulty}</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              {currentQuestion.estimatedTimeSeconds}s target
            </span>
            <span className="inline-flex items-center gap-1">
              <GaugeCircle className="h-4 w-4" />
              Q {index + 1}/{session.questions.length}
            </span>
          </div>
        </div>

        <Progress value={progress} className="mb-6" />

        <h3 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {currentQuestion.questionText}
        </h3>
        {currentQuestion.options.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswer(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  answer === option
                    ? "border-amber-400 bg-amber-400/10 text-amber-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <Textarea
            className="mt-5 min-h-[220px]"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}

        <div className="mt-5">
          <label className="mb-2 block text-sm text-zinc-400">Confidence: {Math.round(confidence * 100)}%</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={confidence}
            onChange={(event) => setConfidence(Number(event.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => submitMutation.mutate(false)}
            disabled={!answer.trim() || submitMutation.isPending || Boolean(currentResponse)}
          >
            {currentResponse ? "Already graded" : "Grade answer"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setAnswer("");
              setConfidence(0.5);
              setIndex((current) => Math.min(session.questions.length - 1, current + 1));
            }}
          >
            Next question
          </Button>
          {isLast ? (
            <Button variant="outline" onClick={() => submitMutation.mutate(true)}>
              Finish session
            </Button>
          ) : null}
        </div>

        {currentResponse ? (
          <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-100">
                Verdict: {currentResponse.gradingFeedback.verdict}
              </p>
              <Badge>{Math.round(currentResponse.score * 100)}%</Badge>
            </div>
            <p className="mt-3 text-sm text-zinc-300">
              {currentResponse.gradingFeedback.conciseFeedback}
            </p>
            {currentResponse.gradingFeedback.missingPoints.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Missing points</p>
                <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                  {currentResponse.gradingFeedback.missingPoints.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Improved answer</p>
              <p className="mt-2 text-sm text-zinc-300">
                {currentResponse.gradingFeedback.improvedAnswer}
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="h-fit">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Session state</p>
        <div className="mt-4 space-y-3">
          {session.questions.map((question, questionIndex) => {
            const response = submitted[question.id];
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setIndex(questionIndex)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  questionIndex === index
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <p className="text-sm font-medium text-zinc-100">{question.topicTitle}</p>
                <p className="mt-1 text-xs text-zinc-500">{question.questionText.slice(0, 80)}...</p>
                {response ? (
                  <p className="mt-2 text-xs text-zinc-400">Score {Math.round(response.score * 100)}%</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
