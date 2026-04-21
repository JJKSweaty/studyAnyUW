"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ProviderProfileInput } from "@/lib/schemas";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

function numeric(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ProviderSettingsForm({
  profiles,
}: {
  profiles: Array<ProviderProfileInput & { id?: string }>;
}) {
  const router = useRouter();
  const activeProfile = useMemo(() => profiles.find((profile) => profile.isActive) ?? profiles[0], [profiles]);
  const [form, setForm] = useState<ProviderProfileInput>(
    activeProfile ?? {
      name: "Ollama Local",
      providerType: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      modelName: "gpt-oss:20b",
      embeddingModel: "",
      temperature: 0.2,
      maxOutputTokens: 1400,
      chunkSize: 900,
      retrievalCount: 5,
      gradingStrictness: "balanced",
      isActive: true,
    },
  );
  const [healthMessage, setHealthMessage] = useState("");
  const [models, setModels] = useState<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/provider/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error("Could not save provider profile.");
      }
      return (await response.json()) as { profileId: string };
    },
    onSuccess: async () => {
      toast.success("Provider profile saved.");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save provider profile.");
    },
  });

  const healthMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/provider/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: form.id }),
      });
      return (await response.json()) as { ok: boolean; message: string };
    },
    onSuccess: (data) => {
      setHealthMessage(data.message);
      toast[data.ok ? "success" : "error"](data.message);
    },
  });

  const modelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/provider/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: form.id }),
      });
      return (await response.json()) as { models?: Array<{ id: string }>; error?: string };
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setModels((data.models ?? []).map((model) => model.id));
      toast.success("Fetched model list.");
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await fetch("/api/provider/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        throw new Error("Could not activate profile.");
      }
    },
    onSuccess: () => {
      toast.success("Active provider switched.");
      router.refresh();
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Local model profile</h3>
          <p className="mt-1 text-sm text-zinc-400">
            The app is provider-agnostic. Point it at whichever local server is running on this machine.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Profile name"
          />
          <select
            value={form.providerType}
            onChange={(event) =>
              setForm({
                ...form,
                providerType: event.target.value as ProviderProfileInput["providerType"],
              })
            }
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
          >
            <option value="ollama">Ollama</option>
            <option value="lmstudio">LM Studio</option>
          </select>
          <Input
            className="md:col-span-2"
            value={form.baseUrl}
            onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
            placeholder="Base URL"
          />
          <Input
            value={form.modelName}
            onChange={(event) => setForm({ ...form, modelName: event.target.value })}
            placeholder="Chat model"
          />
          <Input
            value={form.embeddingModel}
            onChange={(event) => setForm({ ...form, embeddingModel: event.target.value })}
            placeholder="Embedding model"
          />
          <Input
            type="number"
            step="0.1"
            value={form.temperature}
            onChange={(event) => setForm({ ...form, temperature: numeric(event.target.value, 0.2) })}
            placeholder="Temperature"
          />
          <Input
            type="number"
            value={form.maxOutputTokens}
            onChange={(event) =>
              setForm({ ...form, maxOutputTokens: numeric(event.target.value, 1400) })
            }
            placeholder="Max output tokens"
          />
          <Input
            type="number"
            value={form.chunkSize}
            onChange={(event) => setForm({ ...form, chunkSize: numeric(event.target.value, 900) })}
            placeholder="Chunk size"
          />
          <Input
            type="number"
            value={form.retrievalCount}
            onChange={(event) =>
              setForm({ ...form, retrievalCount: numeric(event.target.value, 5) })
            }
            placeholder="Retrieval count"
          />
          <select
            value={form.gradingStrictness}
            onChange={(event) =>
              setForm({
                ...form,
                gradingStrictness: event.target.value as ProviderProfileInput["gradingStrictness"],
              })
            }
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 md:col-span-2"
          >
            <option value="lenient">Lenient grading</option>
            <option value="balanced">Balanced grading</option>
            <option value="strict">Strict grading</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </Button>
          <Button variant="secondary" onClick={() => healthMutation.mutate()} disabled={healthMutation.isPending}>
            Test connection
          </Button>
          <Button variant="outline" onClick={() => modelMutation.mutate()} disabled={modelMutation.isPending}>
            Fetch models
          </Button>
        </div>
        {healthMessage ? <p className="mt-3 text-sm text-zinc-400">{healthMessage}</p> : null}
        {models.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="mb-2 text-sm font-medium text-zinc-200">Available models</p>
            <div className="flex flex-wrap gap-2">
              {models.map((model) => (
                <button
                  key={model}
                  type="button"
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
                  onClick={() => setForm({ ...form, modelName: model })}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Saved profiles</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Rebind the same app to different local machines by switching the active provider profile.
          </p>
        </div>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-100">{profile.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {profile.providerType} • {profile.baseUrl}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">{profile.modelName}</p>
                </div>
                <Button
                  variant={profile.isActive ? "primary" : "outline"}
                  size="sm"
                  onClick={() => profile.id && activateMutation.mutate(profile.id)}
                  disabled={!profile.id || activateMutation.isPending}
                >
                  {profile.isActive ? "Active" : "Make active"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
