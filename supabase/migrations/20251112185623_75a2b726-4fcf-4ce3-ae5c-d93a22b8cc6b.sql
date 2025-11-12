-- 添加允许任何人查看待处理邀请的策略
DROP POLICY IF EXISTS "Anyone can view pending invitations by code" ON partner_invitations;

CREATE POLICY "Anyone can view pending invitations by code"
ON partner_invitations
FOR SELECT
USING (status = 'pending');