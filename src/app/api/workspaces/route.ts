import { NextResponse } from "next/server";

import { createWorkspace, listWorkspaces } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ workspaces: listWorkspaces() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    courseId?: string;
    name?: string;
    description?: string;
    tags?: string[];
  };

  if (!body.courseId || !body.name) {
    return NextResponse.json({ error: "Course and workspace name are required." }, { status: 400 });
  }

  const workspaceId = createWorkspace({
    courseId: body.courseId,
    name: body.name,
    description: body.description,
    tags: body.tags ?? [],
  });

  return NextResponse.json({ workspaceId });
}
