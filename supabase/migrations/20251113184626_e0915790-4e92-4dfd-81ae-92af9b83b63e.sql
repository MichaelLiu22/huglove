-- Drop old date_suggestions table and create new structure for date plans

-- Create date_plans table (main table for date plans)
CREATE TABLE IF NOT EXISTS public.date_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create date_plan_activities table (activities within a date plan)
CREATE TABLE IF NOT EXISTS public.date_plan_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.date_plans(id) ON DELETE CASCADE,
  activity_time TIME,
  location_name TEXT NOT NULL,
  location_type TEXT,
  description TEXT,
  weather_condition TEXT,
  temperature TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on date_plans
ALTER TABLE public.date_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for date_plans
CREATE POLICY "Users can view their relationship date plans"
ON public.date_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_plans.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can create date plans for their relationship"
ON public.date_plans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_plans.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can update their relationship date plans"
ON public.date_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_plans.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their relationship date plans"
ON public.date_plans
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM relationships
    WHERE relationships.id = date_plans.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

-- Enable RLS on date_plan_activities
ALTER TABLE public.date_plan_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for date_plan_activities
CREATE POLICY "Users can view activities of their date plans"
ON public.date_plan_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM date_plans
    JOIN relationships ON relationships.id = date_plans.relationship_id
    WHERE date_plans.id = date_plan_activities.plan_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can create activities for their date plans"
ON public.date_plan_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM date_plans
    JOIN relationships ON relationships.id = date_plans.relationship_id
    WHERE date_plans.id = date_plan_activities.plan_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can update activities of their date plans"
ON public.date_plan_activities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM date_plans
    JOIN relationships ON relationships.id = date_plans.relationship_id
    WHERE date_plans.id = date_plan_activities.plan_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

CREATE POLICY "Users can delete activities of their date plans"
ON public.date_plan_activities
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM date_plans
    JOIN relationships ON relationships.id = date_plans.relationship_id
    WHERE date_plans.id = date_plan_activities.plan_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  )
);

-- Create trigger for date_plans updated_at
CREATE TRIGGER update_date_plans_updated_at
BEFORE UPDATE ON public.date_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_date_plans_relationship_id ON public.date_plans(relationship_id);
CREATE INDEX idx_date_plans_plan_date ON public.date_plans(plan_date);
CREATE INDEX idx_date_plan_activities_plan_id ON public.date_plan_activities(plan_id);
CREATE INDEX idx_date_plan_activities_order ON public.date_plan_activities(plan_id, order_index);