-- Create table for date reports
CREATE TABLE IF NOT EXISTS public.date_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.date_plans(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL,
  report_image_url TEXT,
  photos TEXT[], -- Array of photo URLs
  notes TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.date_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reports in their relationship"
ON public.date_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_reports.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can create reports for their relationship"
ON public.date_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_reports.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can update reports in their relationship"
ON public.date_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_reports.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can delete reports in their relationship"
ON public.date_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_reports.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

-- Create storage bucket for date report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('date-reports', 'date-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for date report photos
CREATE POLICY "Users can upload date report photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'date-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view date report photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'date-reports');

CREATE POLICY "Users can delete their date report photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'date-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);