-- Create storage policies for couple-photos bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload photos to couple-photos bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'couple-photos');

-- Allow users to view photos in couple-photos bucket
CREATE POLICY "Anyone can view couple-photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'couple-photos');

-- Allow users to delete their uploaded photos
CREATE POLICY "Users can delete photos from couple-photos bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'couple-photos');