import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "face-videos";

// Lazy-init: only create clients when env vars are present.
// Returns null when Supabase is not configured (face-video feature disabled).
function makeAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function makeAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Public anon client (used externally for URL generation etc.)
export const supabase = makeAnonClient();

function requireAdmin(): SupabaseClient {
  const admin = makeAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return admin;
}

export async function uploadFaceVideo(
  file: Buffer,
  path: string,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const admin = requireAdmin();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteFaceVideo(path: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export function getFaceVideoPublicUrl(path: string): string {
  const admin = requireAdmin();
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
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

export function buildSalespersonFaceVideoPath(
  salespersonId: string,
  type: "pre" | "post",
  ext: string
): string {
  const timestamp = Date.now();
  return `${salespersonId}/${type}_${timestamp}.${ext}`;
}

export function buildSalespersonIntroVideoPath(salespersonId: string, ext: string): string {
  const timestamp = Date.now();
  return `intro-videos/${salespersonId}/intro_${timestamp}.${ext}`;
}

export async function uploadProfileImage(
  file: Buffer,
  salespersonId: string,
  ext: string,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const admin = requireAdmin();
  const path = `profile-icons/${salespersonId}/icon_${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteProfileImage(path: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}
