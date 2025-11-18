-- Create date_wishlist table for storing places users want to visit
CREATE TABLE public.date_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_address TEXT,
  location_type TEXT,
  description TEXT,
  priority TEXT DEFAULT 'chill' CHECK (priority IN ('must_go', 'chill')),
  estimated_duration INTEGER DEFAULT 60,
  open_time TEXT,
  close_time TEXT,
  tags TEXT[] DEFAULT '{}',
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INTEGER DEFAULT 0,
  last_visited_date DATE,
  notes TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on date_wishlist
ALTER TABLE public.date_wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for date_wishlist
CREATE POLICY "Users can view wishlist in their relationship"
  ON public.date_wishlist FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.relationships
    WHERE relationships.id = date_wishlist.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  ));

CREATE POLICY "Users can create wishlist items"
  ON public.date_wishlist FOR INSERT
  WITH CHECK (auth.uid() = added_by AND EXISTS (
    SELECT 1 FROM public.relationships
    WHERE relationships.id = date_wishlist.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
  ));

CREATE POLICY "Users can update their wishlist items"
  ON public.date_wishlist FOR UPDATE
  USING (auth.uid() = added_by);

CREATE POLICY "Users can delete their wishlist items"
  ON public.date_wishlist FOR DELETE
  USING (auth.uid() = added_by);

-- Add trigger for updated_at on date_wishlist
CREATE TRIGGER update_date_wishlist_updated_at
  BEFORE UPDATE ON public.date_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to date_plan_activities for wishlist tracking
ALTER TABLE public.date_plan_activities
ADD COLUMN wishlist_item_id UUID REFERENCES public.date_wishlist(id) ON DELETE SET NULL,
ADD COLUMN is_ai_recommended BOOLEAN DEFAULT false;