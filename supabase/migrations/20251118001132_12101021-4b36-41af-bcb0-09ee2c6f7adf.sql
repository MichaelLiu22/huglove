-- Add smart routing fields to date_plans table
ALTER TABLE date_plans
ADD COLUMN start_location_address TEXT,
ADD COLUMN start_location_lat NUMERIC,
ADD COLUMN start_location_lng NUMERIC,
ADD COLUMN end_location_address TEXT,
ADD COLUMN end_location_lat NUMERIC,
ADD COLUMN end_location_lng NUMERIC,
ADD COLUMN is_auto_routed BOOLEAN DEFAULT false;

-- Add smart routing fields to date_plan_activities table
ALTER TABLE date_plan_activities
ADD COLUMN priority TEXT DEFAULT 'must_go' CHECK (priority IN ('must_go', 'chill')),
ADD COLUMN estimated_duration INTEGER DEFAULT 60,
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC,
ADD COLUMN travel_time_from_previous INTEGER,
ADD COLUMN is_auto_scheduled BOOLEAN DEFAULT false,
ADD COLUMN skip_reason TEXT;

-- Add index for better query performance
CREATE INDEX idx_date_plan_activities_plan_priority ON date_plan_activities(plan_id, priority);
CREATE INDEX idx_date_plans_auto_routed ON date_plans(is_auto_routed);