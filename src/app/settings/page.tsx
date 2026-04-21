import { AppShell } from "@/components/app-shell";
import { ProviderSettingsForm } from "@/components/provider-settings-form";
import { ensureDefaultProviderProfiles } from "@/lib/server/bootstrap";

export default function SettingsPage() {
  const profiles = ensureDefaultProviderProfiles();

  return (
    <AppShell title="Local provider settings" eyebrow="Settings">
      <ProviderSettingsForm profiles={profiles} />
    </AppShell>
  );
}
