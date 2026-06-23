-- Supabase Row Level Security (RLS) Policies for HomeReelMatch
-- Run these in the Supabase SQL editor after enabling RLS on the storage bucket.

-- ============================================================
-- face-videos bucket
-- ============================================================

-- Enable RLS on the storage.objects table (if not already enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "face-videos: public read" ON storage.objects;
DROP POLICY IF EXISTS "face-videos: salesperson upload own folder" ON storage.objects;
DROP POLICY IF EXISTS "face-videos: salesperson update own folder" ON storage.objects;
DROP POLICY IF EXISTS "face-videos: salesperson delete own folder" ON storage.objects;

-- Policy: Public read access (face videos are served publicly via <video src>)
CREATE POLICY "face-videos: public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'face-videos');

-- Policy: Authenticated salespersons can upload to their own folder
-- Path convention: face-videos/{salespersonId}/{videoId}/{pre|post}_{timestamp}.ext
CREATE POLICY "face-videos: salesperson upload own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'face-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated salespersons can update files in their own folder
CREATE POLICY "face-videos: salesperson update own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'face-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated salespersons can delete files in their own folder
CREATE POLICY "face-videos: salesperson delete own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'face-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: The above policies use Supabase's `auth.uid()` which corresponds to the
-- authenticated user's UUID. In this project, uploads are performed server-side
-- using the SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS), so RLS primarily
-- acts as a defence-in-depth measure against direct Supabase API abuse.
--
-- For direct client uploads (if implemented in the future), the salespersonId
-- must match the authenticated Supabase user's UID.
