import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { archiveCourse, deleteCourse, restoreCourse } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const body = (await request.json()) as { action?: "archive" | "restore" };

  if (body.action === "archive") {
    archiveCourse(courseId);
  } else if (body.action === "restore") {
    restoreCourse(courseId);
  } else {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  deleteCourse(courseId);
  revalidatePath("/");
  revalidatePath("/courses");
  return NextResponse.json({ ok: true });
}
