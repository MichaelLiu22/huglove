-- Add fields to partner_invitations for romantic invitation
ALTER TABLE public.partner_invitations
ADD COLUMN recipient_name text,
ADD COLUMN met_date date,
ADD COLUMN love_message text DEFAULT '从相识的那一刻起，每一天都因为有你而变得特别。让我们一起记录属于我们的美好时光吧。';