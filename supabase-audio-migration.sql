-- =============================================
-- AUDIO RECORDING MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- Add audio_url column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for audio files (run in Storage section or via SQL)
-- Note: You may need to create this bucket manually in Supabase Dashboard > Storage
-- Bucket name: audio
-- Public bucket: Yes (for easy access)

-- If using SQL to create bucket (requires service role):
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio');

-- Storage policy to allow public reads
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'audio');

-- Storage policy to allow authenticated deletes
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'audio');

-- Storage policy to allow service role full access
CREATE POLICY "Allow service role full access" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'audio');
