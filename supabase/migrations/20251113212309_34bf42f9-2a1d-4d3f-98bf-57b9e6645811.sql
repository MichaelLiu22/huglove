-- Add new columns to date_plan_activities for activity reports
ALTER TABLE date_plan_activities 
ADD COLUMN IF NOT EXISTS activity_photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS activity_notes TEXT,
ADD COLUMN IF NOT EXISTS activity_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS activity_rating INTEGER CHECK (activity_rating >= 1 AND activity_rating <= 10),
ADD COLUMN IF NOT EXISTS activity_report_image_url TEXT,
ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP WITH TIME ZONE;