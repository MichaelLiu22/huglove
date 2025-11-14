-- Add bill splitting fields to relationships table
ALTER TABLE relationships 
ADD COLUMN user_split_percentage NUMERIC(5,2) DEFAULT 50.00 CHECK (user_split_percentage >= 0 AND user_split_percentage <= 100),
ADD COLUMN partner_split_percentage NUMERIC(5,2) DEFAULT 50.00 CHECK (partner_split_percentage >= 0 AND partner_split_percentage <= 100);

-- Add bill related fields to date_plan_activities table
ALTER TABLE date_plan_activities 
ADD COLUMN is_gift BOOLEAN DEFAULT false,
ADD COLUMN paid_by UUID REFERENCES auth.users(id);

-- Add comment for clarity
COMMENT ON COLUMN relationships.user_split_percentage IS 'User A bill split percentage';
COMMENT ON COLUMN relationships.partner_split_percentage IS 'User B bill split percentage';
COMMENT ON COLUMN date_plan_activities.is_gift IS 'Mark if this activity is a gift (not included in bill calculation)';
COMMENT ON COLUMN date_plan_activities.paid_by IS 'User ID who paid for this activity';