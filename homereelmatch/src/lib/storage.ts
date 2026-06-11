import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = "face-videos";

export async function uploadFaceVideo(
  file: Buffer,
  path: string,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteFaceVideo(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export function getFaceVideoPublicUrl(path: string): string {
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function buildFaceVideoPath(
  salespersonId: string,
  videoId: string,
  type: "pre" | "post",
  ext: string
): string {
  const timestamp = Date.now();
  return `${salespersonId}/${videoId}/${type}_${timestamp}.${ext}`;
}
