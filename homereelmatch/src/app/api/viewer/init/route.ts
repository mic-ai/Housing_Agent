import { NextResponse } from "next/server";
import { getViewerToken, ensureViewerProfile } from "@/lib/viewer";

export async function POST() {
  try {
    const viewerToken = await getViewerToken();
    if (!viewerToken) {
      return NextResponse.json({ error: "viewerToken cookie is missing" }, { status: 400 });
    }
    await ensureViewerProfile(viewerToken);
    return NextResponse.json({ data: { viewerToken } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
