-- Add expenses field to date_plan_activities table for detailed expense tracking
ALTER TABLE date_plan_activities 
ADD COLUMN IF NOT EXISTS expenses jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN date_plan_activities.expenses IS 'Detailed expense items in format: [{"description": "item name", "amount": 150.00, "category": "餐饮", "paid_by": "user_id"}]';