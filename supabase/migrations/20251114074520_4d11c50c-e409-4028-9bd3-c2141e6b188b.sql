-- Add new fields to date_plan_activities table for ending time and agent information
ALTER TABLE public.date_plan_activities
ADD COLUMN IF NOT EXISTS activity_end_time time without time zone,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS agent_notes text;