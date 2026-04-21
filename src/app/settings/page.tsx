import { AppShell } from "@/components/app-shell";
import { OllamaSetupModal } from "@/components/ollama-setup-modal";
import { ProviderSettingsForm } from "@/components/provider-settings-form";
import { ensureDefaultProviderProfiles } from "@/lib/server/bootstrap";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const profiles = ensureDefaultProviderProfiles();

  return (
    <AppShell title="Local provider settings" eyebrow="Settings">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Need Ollama first?</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Open the in-app setup popup for Windows install, startup, and first-model steps.
              </p>
            </div>
            <OllamaSetupModal triggerLabel="Open Ollama setup" />
          </div>
        </Card>
        <ProviderSettingsForm profiles={profiles} />
      </div>
    </AppShell>
  );
}
