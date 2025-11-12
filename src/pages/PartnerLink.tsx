import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Copy, UserPlus, ArrowLeft, Users, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PartnerLink = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [relationship, setRelationship] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [invitationCode, setInvitationCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  
  // Invitation form fields
  const [recipientName, setRecipientName] = useState("");
  const [metDate, setMetDate] = useState<Date>();
  const [loveMessage, setLoveMessage] = useState("从相识的那一刻起，每一天都因为有你而变得特别。让我们一起记录属于我们的美好时光吧。");

  useEffect(() => {
    if (user) {
      loadRelationshipData();
    }
  }, [user]);

  const loadRelationshipData = async () => {
    try {
      const { data: rel, error: relError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (relError) throw relError;
      
      setRelationship(rel);

      if (rel?.partner_id) {
        const { data: partnerProfile, error: partnerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', rel.partner_id)
          .single();

        if (partnerError) throw partnerError;
        setPartner(partnerProfile);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvitationCode = async () => {
    if (!relationship) {
      toast.error('请先设置恋爱日期');
      return;
    }

    if (!recipientName.trim()) {
      toast.error('请填写收件人昵称');
      return;
    }
    
    if (!metDate) {
      toast.error('请选择相识日期');
      return;
    }

    setCodeLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from('partner_invitations')
        .insert({
          relationship_id: relationship.id,
          inviter_id: user?.id,
          invitation_code: code,
          status: 'pending',
          recipient_name: recipientName,
          met_date: format(metDate, 'yyyy-MM-dd'),
          love_message: loveMessage,
        });

      if (error) throw error;
      
      setInvitationCode(code);
      toast.success('浪漫邀请生成成功！');
    } catch (error: any) {
      console.error('Error generating code:', error);
      toast.error('生成邀请码失败');
    } finally {
      setCodeLoading(false);
    }
  };

  const copyInvitationCode = () => {
    const link = `${window.location.origin}/invitation?code=${invitationCode}`;
    navigator.clipboard.writeText(link);
    toast.success('邀请链接已复制');
  };

  const acceptInvitation = async () => {
    if (!inputCode.trim()) {
      toast.error('请输入邀请码');
      return;
    }

    setCodeLoading(true);
    try {
      // 查找邀请
      const { data: invitation, error: invError } = await supabase
        .from('partner_invitations')
        .select('*, relationships(*)')
        .eq('invitation_code', inputCode.toUpperCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (invError) throw invError;
      
      if (!invitation) {
        toast.error('邀请码无效或已过期');
        return;
      }

      // 检查邀请是否过期
      if (new Date(invitation.expires_at) < new Date()) {
        toast.error('邀请码已过期');
        return;
      }

      // 更新邀请者的relationship
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ partner_id: user?.id })
        .eq('id', invitation.relationship_id);

      if (updateError) throw updateError;

      // 为接受者创建relationship
      const { error: insertError } = await supabase
        .from('relationships')
        .insert({
          user_id: user?.id,
          partner_id: invitation.inviter_id,
          met_date: invitation.relationships.met_date,
          together_date: invitation.relationships.together_date,
          relationship_status: 'active'
        });

      if (insertError) throw insertError;

      // 更新邀请状态
      const { error: statusError } = await supabase
        .from('partner_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (statusError) throw statusError;

      toast.success('成功关联伴侣！');
      loadRelationshipData();
      setInputCode('');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error('接受邀请失败');
    } finally {
      setCodeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">伴侣关联</h1>
          <p className="text-muted-foreground">关联您的伴侣，一起记录美好时光</p>
        </div>

        {partner ? (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                已关联伴侣
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white text-lg font-bold">
                  {partner.nickname?.[0] || 'T'}
                </div>
                <div>
                  <p className="font-semibold text-lg">{partner.nickname || 'TA'}</p>
                  <p className="text-sm text-muted-foreground">{partner.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                你们已经成功关联，可以一起使用评分和日记功能了
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                  生成浪漫邀请
                </CardTitle>
                <CardDescription>
                  创建一封爱的信件，邀请TA成为你的伴侣
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!invitationCode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name">收件人昵称 *</Label>
                      <Input
                        id="recipient-name"
                        placeholder="给TA起一个特别的称呼"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>相识日期 *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !metDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {metDate ? format(metDate, "PPP", { locale: zhCN }) : "选择你们相识的日期"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={metDate}
                            onSelect={setMetDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="love-message">情话（可编辑）</Label>
                      <Textarea
                        id="love-message"
                        placeholder="写下你想对TA说的话..."
                        value={loveMessage}
                        onChange={(e) => setLoveMessage(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={generateInvitationCode}
                      className="w-full"
                      disabled={codeLoading}
                    >
                      <Heart className="w-4 h-4 mr-2" fill="currentColor" />
                      {codeLoading ? '生成中...' : '生成浪漫邀请'}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                      <p className="text-sm text-muted-foreground mb-2">邀请链接</p>
                      <p className="font-mono text-sm break-all text-primary font-semibold">
                        {window.location.origin}/invitation?code={invitationCode}
                      </p>
                    </div>
                    <Button
                      onClick={copyInvitationCode}
                      className="w-full"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      复制邀请链接
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      邀请链接24小时内有效
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  输入邀请码
                </CardTitle>
                <CardDescription>
                  输入伴侣分享的邀请码进行关联
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="输入6位邀请码"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
                <Button
                  onClick={acceptInvitation}
                  className="w-full"
                  disabled={codeLoading || !inputCode.trim()}
                >
                  {codeLoading ? '验证中...' : '接受邀请'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PartnerLink;
