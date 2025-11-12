import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileNav } from "@/components/MobileNav";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Approval {
  id: string;
  relationship_id: string;
  requester_id: string;
  approver_id: string;
  action_type: string;
  action_data: any;
  status: string;
  created_at: string;
  requester_profile?: {
    id: string;
    nickname: string;
  };
}

const Approvals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [myRequests, setMyRequests] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadApprovals();

    // Subscribe to approval changes
    const channel = supabase
      .channel('approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals',
        },
        () => {
          loadApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const loadApprovals = async () => {
    try {
      // Load approvals waiting for my approval
      const { data: pending, error: pendingError } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('approver_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Load requester profiles
      const requesterIds = pending?.map(p => p.requester_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const pendingWithProfiles = pending?.map(p => ({
        ...p,
        requester_profile: profileMap.get(p.requester_id),
      })) || [];

      // Load my requests
      const { data: requests, error: requestsError } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setPendingApprovals(pendingWithProfiles);
      setMyRequests(requests || []);
    } catch (error: any) {
      console.error('Error loading approvals:', error);
      toast.error('加载批准请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId: string, approved: boolean) => {
    try {
      const approval = pendingApprovals.find(a => a.id === approvalId);
      if (!approval) return;

      const { error: updateError } = await supabase
        .from('pending_approvals')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      // If approved, execute the action
      if (approved) {
        await executeAction(approval);
      }

      // Send notification to requester
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: approval.requester_id,
          relationship_id: approval.relationship_id,
          notification_type: 'approval_response',
          title: approved ? '请求已批准' : '请求已拒绝',
          message: `你的${getActionTypeName(approval.action_type)}请求已${approved ? '批准' : '拒绝'}`,
          link: '/approvals',
        });

      if (notifError) throw notifError;

      toast.success(approved ? '已批准' : '已拒绝');
      loadApprovals();
    } catch (error: any) {
      console.error('Error handling approval:', error);
      toast.error('操作失败');
    }
  };

  const executeAction = async (approval: Approval) => {
    try {
      switch (approval.action_type) {
        case 'edit_name':
          await supabase
            .from('relationships')
            .update({ space_name: approval.action_data.new_name })
            .eq('id', approval.relationship_id);
          break;
        case 'reset':
          await supabase
            .from('relationships')
            .delete()
            .eq('id', approval.relationship_id);
          break;
        case 'delete_diary':
          await supabase
            .from('couple_diaries')
            .delete()
            .eq('id', approval.action_data.diary_id);
          break;
        case 'delete_photo':
          // Delete from storage
          const photoFileName = approval.action_data.photo_url.split('/').slice(-2).join('/');
          await supabase.storage
            .from('couple-photos')
            .remove([photoFileName]);
          
          // Delete from database
          await supabase
            .from('couple_photos')
            .delete()
            .eq('id', approval.action_data.photo_id);
          break;
        case 'delete_rating':
          await supabase
            .from('daily_ratings')
            .delete()
            .eq('id', approval.action_data.rating_id);
          break;
      }
    } catch (error: any) {
      console.error('Error executing action:', error);
      throw error;
    }
  };

  const getActionTypeName = (actionType: string): string => {
    const names: Record<string, string> = {
      edit_name: '修改小空间名称',
      reset: '重置数据',
      delete_diary: '删除日记',
      delete_photo: '删除照片',
      delete_rating: '删除评分',
    };
    return names[actionType] || actionType;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return '等待批准';
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
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
    <div className="min-h-screen bg-gradient-soft pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4 md:p-6 shadow-soft">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">批准管理</h1>
              <p className="text-white/80 text-xs md:text-sm">处理伴侣的请求</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="text-sm md:text-base">
              待批准 {pendingApprovals.length > 0 && `(${pendingApprovals.length})`}
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="text-sm md:text-base">我的请求</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无待批准的请求</p>
              </Card>
            ) : (
              pendingApprovals.map((approval) => (
                <Card key={approval.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {getActionTypeName(approval.action_type)}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        来自：{approval.requester_profile?.nickname || '伴侣'}
                      </p>
                      {approval.action_data && (
                        <div className="text-sm bg-muted p-2 rounded mb-2">
                          {approval.action_type === 'edit_name' && (
                            <p>新名称：{approval.action_data.new_name}</p>
                          )}
                          {approval.action_type === 'delete_diary' && (
                            <p>日记标题：{approval.action_data.diary_title}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(approval.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApproval(approval.id, true)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        批准
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleApproval(approval.id, false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="my-requests" className="space-y-4">
            {myRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无请求记录</p>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {getActionTypeName(request.action_type)}
                      </h3>
                      {request.action_data && (
                        <div className="text-sm bg-muted p-2 rounded mb-2">
                          {request.action_type === 'edit_name' && (
                            <p>新名称：{request.action_data.new_name}</p>
                          )}
                          {request.action_type === 'delete_diary' && (
                            <p>日记标题：{request.action_data.diary_title}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <MobileNav userId={user?.id} />
    </div>
  );
};

export default Approvals;
