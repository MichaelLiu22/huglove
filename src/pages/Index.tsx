import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { DateSetup } from "@/components/DateSetup";
import { AnniversaryCard } from "@/components/AnniversaryCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MobileNav } from "@/components/MobileNav";
import { BillSplitSettings } from "@/components/BillSplitSettings";
import { calculateAnniversaries, getDaysTogether } from "@/lib/dateCalculations";
import { Heart, Calendar, Sparkles, LogOut, Users, Star, BookHeart, Image, Edit2, CheckCircle2, CalendarHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateInLA, parseDateInLA } from "@/lib/timezoneUtils";

const Index = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metDate, setMetDate] = useState<Date | null>(null);
  const [togetherDate, setTogetherDate] = useState<Date | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(30); // 默认显示1个月
  const [spaceName, setSpaceName] = useState("我们的小空间");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [relationship, setRelationship] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else {
        loadRelationshipData();
      }
    }
  }, [user, authLoading, navigate]);

  const loadRelationshipData = async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setMetDate(parseDateInLA(data.met_date));
        setTogetherDate(parseDateInLA(data.together_date));
        setSpaceName(data.space_name || '我们的小空间');
        setPartnerId(data.partner_id);
        setRelationshipId(data.id);
        setRelationship(data);
        setShowSetup(false);
      }
    } catch (error: any) {
      console.error('Error loading relationship:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDatesSet = async (met: Date, together: Date) => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .upsert({
          user_id: user?.id,
          met_date: formatDateInLA(met),
          together_date: formatDateInLA(together),
          relationship_status: 'active'
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      setMetDate(met);
      setTogetherDate(together);
      setRelationshipId(data.id);
      setShowSetup(false);
      toast.success('数据保存成功！');
    } catch (error: any) {
      console.error('Error saving relationship:', error);
      toast.error('保存失败，请重试');
    }
  };

  const handleReset = async () => {
    if (!relationshipId) return;
    
    if (partnerId) {
      // Need partner approval
      try {
        const { error } = await supabase
          .from('pending_approvals')
          .insert({
            relationship_id: relationshipId,
            requester_id: user?.id,
            approver_id: partnerId,
            action_type: 'reset',
            action_data: {},
          });

        if (error) throw error;

        // Send notification
        await supabase.from('notifications').insert({
          user_id: partnerId,
          relationship_id: relationshipId,
          notification_type: 'approval_request',
          title: '重置请求',
          message: '伴侣希望重置数据，请查看并批准',
          link: '/approvals',
        });

        toast.success('已发送重置请求，等待伴侣批准');
      } catch (error: any) {
        console.error('Error requesting reset:', error);
        toast.error('发送请求失败');
      }
    } else {
      // No partner, reset directly
      if (!confirm('确定要重置所有数据吗？此操作不可恢复！')) return;
      
      try {
        const { error } = await supabase
          .from('relationships')
          .delete()
          .eq('id', relationshipId);

        if (error) throw error;

        setMetDate(null);
        setTogetherDate(null);
        setShowSetup(true);
        toast.success('数据已重置');
      } catch (error: any) {
        console.error('Error resetting:', error);
        toast.error('重置失败');
      }
    }
  };

  const handleEditName = async () => {
    if (!newSpaceName.trim()) {
      toast.error('名称不能为空');
      return;
    }

    if (!relationshipId) return;

    if (partnerId) {
      // Need partner approval
      try {
        const { error } = await supabase
          .from('pending_approvals')
          .insert({
            relationship_id: relationshipId,
            requester_id: user?.id,
            approver_id: partnerId,
            action_type: 'edit_name',
            action_data: { new_name: newSpaceName },
          });

        if (error) throw error;

        // Send notification
        await supabase.from('notifications').insert({
          user_id: partnerId,
          relationship_id: relationshipId,
          notification_type: 'approval_request',
          title: '修改名称请求',
          message: `伴侣希望将小空间名称改为"${newSpaceName}"`,
          link: '/approvals',
        });

        toast.success('已发送修改请求，等待伴侣批准');
        setIsEditDialogOpen(false);
      } catch (error: any) {
        console.error('Error requesting name change:', error);
        toast.error('发送请求失败');
      }
    } else {
      // No partner, update directly
      try {
        const { error } = await supabase
          .from('relationships')
          .update({ space_name: newSpaceName })
          .eq('id', relationshipId);

        if (error) throw error;

        setSpaceName(newSpaceName);
        setIsEditDialogOpen(false);
        toast.success('名称已更新');
      } catch (error: any) {
        console.error('Error updating name:', error);
        toast.error('更新失败');
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (showSetup || !metDate || !togetherDate) {
    return <DateSetup onDatesSet={handleDatesSet} />;
  }

  const anniversaries = calculateAnniversaries(metDate, togetherDate);
  const daysTogether = getDaysTogether(togetherDate);
  const upcomingAnniversaries = anniversaries.filter(a => !a.isPast && a.daysUntil <= timeRange);
  const pastAnniversaries = anniversaries.filter(a => a.isPast);

  return (
    <div className="min-h-screen bg-gradient-soft pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4 md:p-6 shadow-soft">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Heart className="w-5 h-5 md:w-6 md:h-6" fill="white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold">{spaceName}</h1>
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={() => setNewSpaceName(spaceName)}
                      >
                        <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>修改小空间名称</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="space-name">新名称</Label>
                          <Input
                            id="space-name"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            placeholder="输入新名称"
                          />
                        </div>
                        {partnerId && (
                          <p className="text-sm text-muted-foreground">
                            由于你已关联伴侣，此修改需要经过伴侣批准
                          </p>
                        )}
                        <Button onClick={handleEditName} className="w-full">
                          {partnerId ? '发送请求' : '确认修改'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-white/80 text-xs md:text-sm">记录每一个美好时刻</p>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2">
              <div className="hidden md:block">
                <NotificationCenter userId={user?.id || ''} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/approvals')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                批准
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/partner')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Users className="w-4 h-4 mr-2" />
                伴侣
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/rating')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Star className="w-4 h-4 mr-2" />
                评分
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/diary')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <BookHeart className="w-4 h-4 mr-2" />
                日记
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/photos')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Image className="w-4 h-4 mr-2" />
                照片
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/weekend-plans')}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <CalendarHeart className="w-4 h-4 mr-2" />
                约会
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                重置
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => signOut()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs md:text-sm text-white/80">相识于</span>
              </div>
              <p className="text-base md:text-lg font-semibold">
                {metDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4" fill="white" />
                <span className="text-xs md:text-sm text-white/80">在一起</span>
              </div>
              <p className="text-base md:text-lg font-semibold">
                {togetherDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs md:text-sm text-white/80">已经在一起</span>
              </div>
              <p className="text-base md:text-lg font-semibold">
                {daysTogether} 天
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Upcoming Anniversaries */}
        {upcomingAnniversaries.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">未来纪念日</h2>
              </div>
              <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1个月</SelectItem>
                  <SelectItem value="90">3个月</SelectItem>
                  <SelectItem value="180">6个月</SelectItem>
                  <SelectItem value="365">1年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {upcomingAnniversaries.map((anniversary) => (
                <AnniversaryCard key={anniversary.id} {...anniversary} />
              ))}
            </div>
          </section>
        )}


        {/* Past Anniversaries */}
        {pastAnniversaries.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-muted rounded-full"></div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">已度过的纪念日</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {pastAnniversaries.slice(0, 6).map((anniversary) => (
                <AnniversaryCard key={anniversary.id} {...anniversary} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav userId={user?.id} />
    </div>
  );
};

export default Index;
