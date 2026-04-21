import { NextResponse } from "next/server";

import { createCourse, findCourseByCode, listCourses } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ courses: listCourses() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    code?: string;
    description?: string;
  };

  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Name and code are required." }, { status: 400 });
  }

  const existing = findCourseByCode(body.code);
  if (existing) {
    return NextResponse.json({ courseId: existing.id, reused: true });
  }

  const courseId = createCourse({
    name: body.name,
    code: body.code,
    description: body.description,
  });

  return NextResponse.json({ courseId });
}
