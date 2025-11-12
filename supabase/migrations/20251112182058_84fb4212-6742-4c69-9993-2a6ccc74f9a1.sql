-- Add space_name to relationships table
ALTER TABLE public.relationships
ADD COLUMN space_name text DEFAULT '我们的小空间';

-- Create pending_approvals table for partner approval system
CREATE TABLE public.pending_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  approver_id uuid NOT NULL,
  action_type text NOT NULL, -- 'edit_name', 'reset', 'delete_diary', 'delete_photo', 'delete_rating'
  action_data jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_approvals
CREATE POLICY "Users can view approvals in their relationship"
  ON public.pending_approvals
  FOR SELECT
  USING (
    requester_id = auth.uid() OR approver_id = auth.uid()
  );

CREATE POLICY "Users can create approval requests"
  ON public.pending_approvals
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = pending_approvals.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
      AND relationships.partner_id IS NOT NULL
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON public.pending_approvals
  FOR UPDATE
  USING (auth.uid() = approver_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  relationship_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'diary_update', 'approval_request', 'approval_response'
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for their partner"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM relationships
      WHERE relationships.id = notifications.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_pending_approvals_updated_at
  BEFORE UPDATE ON public.pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();