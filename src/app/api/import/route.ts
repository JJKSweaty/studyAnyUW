import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { importWorkspacePackage } from "@/lib/server/import-workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Import file is required." }, { status: 400 });
  }

  const workspaceId = await importWorkspacePackage(file);
  revalidatePath("/");
  revalidatePath(`/workspace/${workspaceId}`);
  return NextResponse.json({ workspaceId });
}
