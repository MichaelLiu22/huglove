-- Create partner_invitations table
CREATE TABLE public.partner_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_invitations
CREATE POLICY "Users can view invitations they created"
ON public.partner_invitations
FOR SELECT
USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
ON public.partner_invitations
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their invitations"
ON public.partner_invitations
FOR UPDATE
USING (auth.uid() = inviter_id);

-- Create couple_diaries table
CREATE TABLE public.couple_diaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'excited', 'calm', 'anxious', 'loving', 'thoughtful')),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.couple_diaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couple_diaries
CREATE POLICY "Users can view their own diaries"
ON public.couple_diaries
FOR SELECT
USING (auth.uid() = author_id);

CREATE POLICY "Users can view shared diaries from partner"
ON public.couple_diaries
FOR SELECT
USING (
  is_shared = true 
  AND EXISTS (
    SELECT 1 FROM public.relationships
    WHERE relationships.id = couple_diaries.relationship_id
    AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    AND relationships.user_id != couple_diaries.author_id
  )
);

CREATE POLICY "Users can create their own diaries"
ON public.couple_diaries
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own diaries"
ON public.couple_diaries
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own diaries"
ON public.couple_diaries
FOR DELETE
USING (auth.uid() = author_id);

-- Add trigger for updated_at
CREATE TRIGGER update_couple_diaries_updated_at
BEFORE UPDATE ON public.couple_diaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();