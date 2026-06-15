import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return expected === signature;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const body = await request.text();
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";

  if (!verifySignature(body, signature, secret)) {
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
