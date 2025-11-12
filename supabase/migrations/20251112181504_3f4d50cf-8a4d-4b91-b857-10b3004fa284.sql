-- Create storage bucket for couple photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'couple-photos',
  'couple-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create couple_photos table
CREATE TABLE public.couple_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id uuid NOT NULL,
  uploader_id uuid NOT NULL,
  photo_url text NOT NULL,
  caption text,
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.couple_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couple_photos
CREATE POLICY "Users can view photos in their relationship"
  ON public.couple_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = couple_photos.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload photos to their relationship"
  ON public.couple_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = couple_photos.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON public.couple_photos
  FOR DELETE
  USING (auth.uid() = uploader_id);

-- Create trigger for updated_at
CREATE TRIGGER update_couple_photos_updated_at
  BEFORE UPDATE ON public.couple_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for couple-photos bucket
CREATE POLICY "Users can view photos in their relationship bucket"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'couple-photos'
    AND EXISTS (
      SELECT 1 FROM relationships
      WHERE (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload photos to their relationship bucket"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'couple-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own photos from bucket"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'couple-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );