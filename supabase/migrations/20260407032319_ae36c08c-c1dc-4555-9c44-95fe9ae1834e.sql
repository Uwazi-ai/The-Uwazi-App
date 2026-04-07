
-- Add notification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_elections boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_lessons boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_streak_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_civic_alerts boolean NOT NULL DEFAULT true;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
