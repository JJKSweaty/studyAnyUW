import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { archiveWorkspace, deleteWorkspace, restoreWorkspace } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const body = (await request.json()) as { action?: "archive" | "restore" };

  if (body.action === "archive") {
    archiveWorkspace(workspaceId);
  } else if (body.action === "restore") {
    restoreWorkspace(workspaceId);
  } else {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/workspace/${workspaceId}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  deleteWorkspace(workspaceId);
  revalidatePath("/");
  revalidatePath("/courses");
  return NextResponse.json({ ok: true });
}
