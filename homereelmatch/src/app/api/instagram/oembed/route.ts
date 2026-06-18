import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getInstagramOEmbed } from "@/lib/instagram";

const QuerySchema = z.object({
  url: z.string().url(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { url } = QuerySchema.parse(Object.fromEntries(searchParams));

    const data = await getInstagramOEmbed(url);
    if (!data) {
      return NextResponse.json({ error: "oEmbed unavailable" }, { status: 503 });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
