import { NextResponse } from "next/server";

import { providerProfileSchema } from "@/lib/schemas";
import { getProvider } from "@/lib/server/providers";
import { getActiveProviderProfile, listProviderProfiles } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    profileId?: string;
    profile?: unknown;
  };
  const profiles = listProviderProfiles();
  const profileFromBody = body.profile
    ? providerProfileSchema.parse(body.profile)
    : null;
  const profile =
    profileFromBody ??
    profiles.find((item) => item.id === body.profileId) ??
    getActiveProviderProfile();

  if (!profile) {
    return NextResponse.json({ models: [], error: "No provider profile configured." });
  }

  try {
    const provider = getProvider(profile.providerType);
    const models = await provider.listModels(profile as typeof profile & { id: string });
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      {
        models: [],
        error: error instanceof Error ? error.message : "Could not fetch models.",
      },
      { status: 500 },
    );
  }
}
