import { NextResponse } from "next/server";

import { ensureDefaultProviderProfiles } from "@/lib/server/bootstrap";
import { setActiveProvider, upsertProviderProfile } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ profiles: ensureDefaultProviderProfiles() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const profileId = upsertProviderProfile(body);
  return NextResponse.json({ profileId });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { profileId?: string };
  if (!body.profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }
  setActiveProvider(body.profileId);
  return NextResponse.json({ ok: true });
}
