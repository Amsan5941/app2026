-- ============================================================
-- Progress Photos Table + Storage Policies
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1) Data table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_created
  ON progress_photos(user_id, created_at DESC);

-- Optional guard so the same storage object path cannot be inserted twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_photos_storage_path
  ON progress_photos(storage_path);

-- 2) RLS for table
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'progress_photos'
      AND policyname = 'Users can view own progress photos'
  ) THEN
    CREATE POLICY "Users can view own progress photos"
      ON progress_photos FOR SELECT
      USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'progress_photos'
      AND policyname = 'Users can insert own progress photos'
  ) THEN
    CREATE POLICY "Users can insert own progress photos"
      ON progress_photos FOR INSERT
      WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'progress_photos'
      AND policyname = 'Users can delete own progress photos'
  ) THEN
    CREATE POLICY "Users can delete own progress photos"
      ON progress_photos FOR DELETE
      USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
  END IF;
END
$$;

-- 3) Storage bucket + storage RLS policies
-- Bucket name must match services/progressPhotos.ts BUCKET constant.
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Progress photos read own files'
  ) THEN
    CREATE POLICY "Progress photos read own files"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'progress-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Progress photos upload own files'
  ) THEN
    CREATE POLICY "Progress photos upload own files"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'progress-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Progress photos delete own files'
  ) THEN
    CREATE POLICY "Progress photos delete own files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'progress-photos'
        AND split_part(name, '/', 1) = auth.uid()::text
      );
  END IF;
END
$$;
