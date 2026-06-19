import { NextResponse } from "next/server";

// Deprecated: use /api/salesperson/profile/face-videos instead
export async function POST() {
  return NextResponse.json({ error: "Use /api/salesperson/profile/face-videos" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Use /api/salesperson/profile/face-videos/[id]" }, { status: 410 });
}
