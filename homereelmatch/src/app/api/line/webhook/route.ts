import { NextRequest, NextResponse } from "next/server";
import { validateLineSignature } from "@/lib/line";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const body = await request.text();

  if (!validateLineSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as { destination: string; events: { type: string }[] };

  // Process events (follow, unfollow, message, etc.)
  for (const event of payload.events) {
    if (event.type === "follow") {
      // Handle follow event — can be extended to store LINE user mapping
    }
    // Other event types handled as needed
  }

  return NextResponse.json({ status: "ok" });
}
