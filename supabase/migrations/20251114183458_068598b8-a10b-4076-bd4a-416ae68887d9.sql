-- Create storage bucket for diary photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-photos',
  'diary-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for diary photos bucket
CREATE POLICY "Users can view diary photos in their relationship"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diary-photos' AND
  EXISTS (
    SELECT 1 FROM couple_diaries cd
    JOIN relationships r ON r.id = cd.relationship_id
    WHERE cd.id::text = (storage.foldername(name))[1]
    AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can upload photos to their own diaries"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diary-photos' AND
  EXISTS (
    SELECT 1 FROM couple_diaries cd
    WHERE cd.id::text = (storage.foldername(name))[1]
    AND cd.author_id = auth.uid()
  )
);

CREATE POLICY "Users can delete photos from their own diaries"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diary-photos' AND
  EXISTS (
    SELECT 1 FROM couple_diaries cd
    WHERE cd.id::text = (storage.foldername(name))[1]
    AND cd.author_id = auth.uid()
  )
);