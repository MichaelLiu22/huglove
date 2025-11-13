-- Add location_address column to date_plan_activities table
ALTER TABLE public.date_plan_activities
ADD COLUMN IF NOT EXISTS location_address TEXT;