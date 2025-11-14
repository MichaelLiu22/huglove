-- Add estimated_cost column to date_plan_activities table
ALTER TABLE date_plan_activities
ADD COLUMN estimated_cost numeric(10,2) DEFAULT 0;