import { unstable_cache } from "next/cache";

export interface InstagramOEmbedData {
  html: string;
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
  width?: number;
  height?: number;
}

// Cached oEmbed fetch — TTL 24h.
// Falls back to null if no access token is configured or on any API error.
export const getInstagramOEmbed = unstable_cache(
  async (postUrl: string): Promise<InstagramOEmbedData | null> => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) return null;

    const endpoint = new URL("https://graph.facebook.com/v19.0/instagram_oembed");
    endpoint.searchParams.set("url", postUrl);
    endpoint.searchParams.set("access_token", token);
    endpoint.searchParams.set("omitscript", "true"); // we load the script once per page

    try {
      const res = await fetch(endpoint.toString(), { next: { revalidate: 86400 } });
      if (!res.ok) {
        console.error(`Instagram oEmbed error ${res.status} for ${postUrl}`);
        return null;
      }
      return (await res.json()) as InstagramOEmbedData;
    } catch (err) {
      console.error("Instagram oEmbed fetch failed:", err);
      return null;
    }
  },
  ["instagram-oembed"],
  { revalidate: 86400, tags: ["instagram-oembed"] }
);
