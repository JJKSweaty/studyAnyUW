import { NextResponse } from "next/server";

import { exportWorkspacePackage } from "@/lib/server/workspace-package";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const exported = await exportWorkspacePackage(workspaceId);
  const body = new Uint8Array(exported.buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exported.fileName}"`,
    },
  });
}
