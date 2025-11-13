-- Add recommended_dishes column to date_plan_activities table
ALTER TABLE public.date_plan_activities
ADD COLUMN IF NOT EXISTS recommended_dishes TEXT;