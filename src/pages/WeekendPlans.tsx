import { useState, useEffect, useRef } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, CalendarHeart, MapPin, Plus, Check, Cloud, Trash2, Calendar as CalendarIcon, Edit, Loader2, UtensilsCrossed, Coffee, Trees, Film, ShoppingBag, UserCircle, MoreHorizontal, Gift, BookHeart, Star, Copy, Phone, Bot } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MobileNav } from "@/components/MobileNav";
import { formatDateInLA, parseDateInLA, toLATime } from "@/lib/timezoneUtils";
import { ActivityDetailsDialog } from "@/components/ActivityDetailsDialog";
import { DatePlanReportDialog } from "@/components/DatePlanReportDialog";
import { BillSplitSettings } from "@/components/BillSplitSettings";

interface Activity {
  id: string;
  activity_time: string;
  activity_end_time?: string;
  location_name: string;
  location_address?: string;
  location_type: string;
  description: string;
  weather_condition?: string;
  temperature?: string;
  recommended_dishes?: string;
  order_index: number;
  activity_photos?: string[];
  activity_notes?: string;
  activity_rating?: number;
  contact_name?: string;
  contact_phone?: string;
  agent_notes?: string;
  estimated_cost?: number;
  is_gift?: boolean;
  paid_by?: string;
}

interface DatePlan {
  id: string;
  plan_date: string;
  notes: string;
  is_completed: boolean;
  activities: Activity[];
}

const WeekendPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upcomingPlans, setUpcomingPlans] = useState<DatePlan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<DatePlan[]>([]);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityDetailsDialogOpen, setActivityDetailsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [datePlanReportDialogOpen, setDatePlanReportDialogOpen] = useState(false);
  const [selectedPlanForReport, setSelectedPlanForReport] = useState<{ id: string; date: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DatePlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<Activity[]>([
    { id: `temp-${Date.now()}`, activity_time: "09:00", location_name: "", location_address: "", location_type: "", description: "", order_index: 0 }
  ]);
  const [fetchingWeather, setFetchingWeather] = useState<number | null>(null);
  const [fetchingRecommendations, setFetchingRecommendations] = useState<number | null>(null);
  const [generatingDiary, setGeneratingDiary] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [relationship, setRelationship] = useState<any>(null);
  const activitiesEndRef = useRef<HTMLDivElement>(null);
  
  // 复制到剪贴板函数
  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制到剪贴板`);
    } catch (error) {
      toast.error('复制失败');
    }
  };
  
  // 为活动卡片定义不同的毛玻璃背景色
  const activityColors = [
    "bg-primary/5 backdrop-blur-sm border border-primary/20",
    "bg-secondary/5 backdrop-blur-sm border border-secondary/20",
    "bg-accent/5 backdrop-blur-sm border border-accent/20",
    "bg-blue-500/5 backdrop-blur-sm border border-blue-500/20",
    "bg-purple-500/5 backdrop-blur-sm border border-purple-500/20",
    "bg-pink-500/5 backdrop-blur-sm border border-pink-500/20",
    "bg-green-500/5 backdrop-blur-sm border border-green-500/20",
    "bg-orange-500/5 backdrop-blur-sm border border-orange-500/20"
  ];

  // 根据活动类型返回对应的图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "餐厅":
        return <UtensilsCrossed className="h-5 w-5 text-orange-500" />;
      case "咖啡厅":
        return <Coffee className="h-5 w-5 text-amber-600" />;
      case "公园":
        return <Trees className="h-5 w-5 text-green-500" />;
      case "电影院":
        return <Film className="h-5 w-5 text-purple-500" />;
      case "商场":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case "Agent":
        return <UserCircle className="h-5 w-5 text-pink-500" />;
      case "其他":
        return <MoreHorizontal className="h-5 w-5 text-muted-foreground" />;
      default:
        return <MoreHorizontal className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // 根据活动类型返回对应的边框和背景颜色
  const getActivityColorClasses = (type: string) => {
    switch (type) {
      case "餐厅":
        return "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20";
      case "咖啡厅":
        return "border-l-amber-600 bg-amber-50/50 dark:bg-amber-950/20";
      case "公园":
        return "border-l-green-500 bg-green-50/50 dark:bg-green-950/20";
      case "电影院":
        return "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20";
      case "商场":
        return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
      case "Agent":
        return "border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20";
      case "其他":
        return "border-l-border bg-muted/20";
      default:
        return "border-l-border bg-muted/20";
    }
  };

  // 检测活动时间冲突
  const checkTimeConflict = (currentIndex: number, startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    
    const currentStart = new Date(`2000-01-01T${startTime}`);
    const currentEnd = new Date(`2000-01-01T${endTime}`);
    
    return activities.some((activity, index) => {
      if (index === currentIndex || !activity.activity_time || !activity.activity_end_time) return false;
      
      const actStart = new Date(`2000-01-01T${activity.activity_time}`);
      const actEnd = new Date(`2000-01-01T${activity.activity_end_time}`);
      
      // 检查时间是否重叠
      return (currentStart < actEnd && currentEnd > actStart);
    });
  };

  // 计算预算分类统计
  const getBudgetByCategory = () => {
    const categories: { [key: string]: number } = {};
    
    activities.forEach(activity => {
      // 排除gift的活动
      if (!activity.is_gift && activity.estimated_cost && activity.estimated_cost > 0) {
        const category = activity.location_type || "其他";
        categories[category] = (categories[category] || 0) + activity.estimated_cost;
      }
    });
    
    return Object.entries(categories).map(([category, cost]) => ({
      category,
      cost,
      icon: getActivityIcon(category)
    })).sort((a, b) => b.cost - a.cost);
  };

  // 计算单个计划的预算分类统计
  const getPlanBudgetByCategory = (plan: DatePlan) => {
    const categories: { [key: string]: number } = {};
    
    plan.activities.forEach(activity => {
      // 排除gift的活动
      if (!activity.is_gift && activity.estimated_cost && activity.estimated_cost > 0) {
        const category = activity.location_type || "其他";
        categories[category] = (categories[category] || 0) + activity.estimated_cost;
      }
    });
    
    return Object.entries(categories).map(([category, cost]) => ({
      category,
      cost,
      icon: getActivityIcon(category)
    })).sort((a, b) => b.cost - a.cost);
  };

  // 计算账单分摊
  const calculateBillSplit = (plan: DatePlan) => {
    if (!relationship) return null;
    
    const totalCost = plan.activities
      .filter(a => !a.is_gift)
      .reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
    
    const userSplit = relationship.user_split_percentage || 50;
    const partnerSplit = relationship.partner_split_percentage || 50;
    
    const userShare = (totalCost * userSplit) / 100;
    const partnerShare = (totalCost * partnerSplit) / 100;
    
    const userPaid = plan.activities
      .filter(a => !a.is_gift && a.paid_by === user?.id)
      .reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
    
    const partnerPaid = plan.activities
      .filter(a => !a.is_gift && a.paid_by === relationship.partner_id)
      .reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
    
    return {
      totalCost,
      userShare,
      partnerShare,
      userPaid,
      partnerPaid,
      userBalance: userPaid - userShare,
      partnerBalance: partnerPaid - partnerShare
    };
  };

  // 生成AI日记
  const handleGenerateDiary = async (planId: string) => {
    setGeneratingDiary(planId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diary-from-plan', {
        body: { planId }
      });

      if (error) throw error;

      toast.success('日记生成成功！');
      navigate('/diary');
    } catch (error: any) {
      console.error('Error generating diary:', error);
      toast.error(error.message || '生成日记失败');
    } finally {
      setGeneratingDiary(null);
    }
  };

  useEffect(() => {
    if (user) fetchRelationship();
  }, [user]);

  useEffect(() => {
    if (relationshipId) fetchPlans();
  }, [relationshipId]);

  const fetchRelationship = async () => {
    try {
      const { data, error } = await supabase.from('relationships').select('id').eq('user_id', user?.id).single();
      if (error) throw error;
      setRelationshipId(data.id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // @ts-ignore - temporary cast until types regenerate
      const { data: plansData } = await (supabase as any).from('date_plans' as any).select('*').eq('relationship_id', relationshipId).order('plan_date', { ascending: true });
      
      const plansWithActivities = await Promise.all((plansData || []).map(async (plan) => {
        // @ts-ignore - Type will be fixed when types.ts regenerates
        const { data: activitiesData } = await (supabase as any).from('date_plan_activities' as any).select('*').eq('plan_id', plan.id).order('activity_time', { ascending: true });
        return { ...plan, activities: activitiesData || [] };
      }));

      const today = toLATime(new Date());
      today.setHours(0, 0, 0, 0);
      setUpcomingPlans(plansWithActivities.filter(p => !p.is_completed && parseDateInLA(p.plan_date) >= today) as unknown as DatePlan[]);
      setHistoryPlans(plansWithActivities.filter(p => p.is_completed || parseDateInLA(p.plan_date) < today) as unknown as DatePlan[]);
    } catch (error) {
      toast.error('获取计划失败');
    } finally {
      setLoading(false);
    }
  };

  const addOneHour = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleAddActivity = () => {
    const defaultTime = "09:00";
    setActivities([...activities, { 
      id: `temp-${Date.now()}`, 
      activity_time: defaultTime, 
      activity_end_time: addOneHour(defaultTime),
      location_name: "", 
      location_address: "", 
      location_type: "", 
      description: "", 
      order_index: activities.length 
    }]);
    setTimeout(() => {
      activitiesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleFetchWeather = async (index: number) => {
    const activity = activities[index];
    if (!activity.location_address || !selectedDate) {
      toast.error('请先填写地址和日期');
      return;
    }

    setFetchingWeather(index);
    try {
      const { data: weatherData, error: weatherError } = await supabase.functions.invoke('get-weather', {
        body: {
          address: activity.location_address,
          date: formatDateInLA(selectedDate)
        }
      });

      if (weatherError) throw weatherError;

      const newActivities = [...activities];
      newActivities[index].weather_condition = weatherData.condition;
      newActivities[index].temperature = weatherData.temperature;
      setActivities(newActivities);
      
      toast.success('天气信息已更新');
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast.error('获取天气失败');
    } finally {
      setFetchingWeather(null);
    }
  };

  const handleEditPlan = (plan: DatePlan) => {
    setEditingPlan(plan);
    setSelectedDate(parseDateInLA(plan.plan_date));
    setNotes(plan.notes || "");
    setActivities(plan.activities.map(a => ({
      id: a.id,
      activity_time: a.activity_time,
      location_name: a.location_name,
      location_address: a.location_address || "",
      location_type: a.location_type,
      description: a.description,
      weather_condition: a.weather_condition,
      temperature: a.temperature,
      recommended_dishes: a.recommended_dishes,
      contact_name: a.contact_name,
      contact_phone: a.contact_phone,
      agent_notes: a.agent_notes,
      order_index: a.order_index,
      estimated_cost: a.estimated_cost,
      is_gift: a.is_gift,
      paid_by: a.paid_by
    })));
    setIsDialogOpen(true);
  };

  const handleRemoveActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleFetchRecommendations = async (index: number) => {
    const activity = activities[index];
    if (!activity.location_name || activity.location_type !== "餐厅") {
      toast.error('请先填写餐厅名称');
      return;
    }

    setFetchingRecommendations(index);
    try {
      const { data, error } = await supabase.functions.invoke('get-restaurant-recommendations', {
        body: {
          restaurantName: activity.location_name,
          locationAddress: activity.location_address
        }
      });

      if (error) throw error;

      const newActivities = [...activities];
      newActivities[index].recommended_dishes = data.recommendations;
      setActivities(newActivities);
      
      toast.success('推荐菜品已获取');
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('获取推荐菜品失败');
    } finally {
      setFetchingRecommendations(null);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedDate || activities.filter(a => a.location_name.trim()).length === 0) {
      toast.error('请填写必要信息');
      return;
    }

    try {
      // 按时间排序活动
      const sortedActivities = [...activities]
        .filter(a => a.location_name.trim())
        .sort((a, b) => {
          const timeA = a.activity_time || '00:00';
          const timeB = b.activity_time || '00:00';
          return timeA.localeCompare(timeB);
        });

      if (editingPlan) {
        // 更新现有计划
        await (supabase as any).from('date_plans' as any).update({
          plan_date: formatDateInLA(selectedDate),
          notes
        }).eq('id', editingPlan.id);

        // 删除旧活动
        await (supabase as any).from('date_plan_activities' as any).delete().eq('plan_id', editingPlan.id);

        // 插入新活动
        await (supabase as any).from('date_plan_activities' as any).insert(
          sortedActivities.map((a, i) => ({ 
            plan_id: editingPlan.id, 
            activity_time: a.activity_time,
            activity_end_time: a.activity_end_time,
            location_name: a.location_name,
            location_address: a.location_address,
            location_type: a.location_type,
            description: a.description,
            weather_condition: a.weather_condition,
            temperature: a.temperature,
            recommended_dishes: a.recommended_dishes,
            contact_name: a.contact_name,
            contact_phone: a.contact_phone,
            agent_notes: a.agent_notes,
            order_index: i
          })) as any as any
        );

        toast.success('计划已更新');
      } else {
        // 创建新计划
        const { data: planData } = await (supabase as any).from('date_plans' as any).insert({
          relationship_id: relationshipId,
          plan_date: formatDateInLA(selectedDate),
          notes,
          is_completed: false
        }).select().single();

        await (supabase as any).from('date_plan_activities' as any).insert(
          sortedActivities.map((a, i) => ({ 
            plan_id: planData!.id, 
            activity_time: a.activity_time,
            activity_end_time: a.activity_end_time,
            location_name: a.location_name,
            location_address: a.location_address,
            location_type: a.location_type,
            description: a.description,
            weather_condition: a.weather_condition,
            temperature: a.temperature,
            recommended_dishes: a.recommended_dishes,
            contact_name: a.contact_name,
            contact_phone: a.contact_phone,
            agent_notes: a.agent_notes,
            order_index: i
          })) as any
        );

        toast.success('计划已添加');
      }
      
      setIsDialogOpen(false);
      setEditingPlan(null);
      setSelectedDate(undefined);
      setNotes("");
      setActivities([{ id: `temp-${Date.now()}`, activity_time: "09:00", location_name: "", location_address: "", location_type: "", description: "", order_index: 0 }]);
      fetchPlans();
    } catch (error) {
      toast.error(editingPlan ? '更新失败' : '添加失败');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-soft pb-20 md:pb-8">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold">周末约会计划</h1>
              <p className="text-sm text-muted-foreground">记录每一次美好约会</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {relationship && relationshipId && (
              <BillSplitSettings
                relationshipId={relationshipId}
                userSplit={relationship.user_split_percentage || 50}
                partnerSplit={relationship.partner_split_percentage || 50}
                onUpdate={fetchPlans}
              />
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingPlan(null);
                setSelectedDate(undefined);
                setNotes("");
                setActivities([{ id: `temp-${Date.now()}`, activity_time: "09:00", location_name: "", location_address: "", location_type: "", description: "", order_index: 0 }]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-white"><Plus className="h-4 w-4 mr-2" />添加计划</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? '编辑约会计划' : '创建约会计划'}</DialogTitle>
                <DialogDescription>计划一整天的美好约会</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>约会日期 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN }) : "选择日期"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={zhCN} /></PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>约会笔记</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="记录这次约会..." rows={3} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>活动安排 *</Label>
                  </div>

                  {activities.map((activity, i) => (
                    <Card key={i} className={`p-4 space-y-4 transition-colors duration-300 ${activityColors[i % activityColors.length]}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {activity.location_type && (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                              {getActivityIcon(activity.location_type)}
                            </div>
                          )}
                          <span className="font-medium text-sm">活动 {i + 1}</span>
                        </div>
                        {activities.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveActivity(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>开始时间</Label>
                          <Input type="time" value={activity.activity_time} onChange={(e) => {
                            const newActs = [...activities];
                            newActs[i].activity_time = e.target.value;
                            // 如果结束时间为空，自动设置为开始时间+1小时
                            if (!newActs[i].activity_end_time) {
                              newActs[i].activity_end_time = addOneHour(e.target.value);
                            }
                            setActivities(newActs);
                          }} />
                        </div>
                        <div>
                          <Label>结束时间（可选）</Label>
                          <Input type="time" value={activity.activity_end_time || ''} onChange={(e) => {
                            const newActs = [...activities];
                            newActs[i].activity_end_time = e.target.value;
                            setActivities(newActs);
                          }} />
                        </div>
                      </div>
                      {/* 时间冲突警告 */}
                      {activity.activity_time && activity.activity_end_time && checkTimeConflict(i, activity.activity_time, activity.activity_end_time) && (
                        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                          <span>⚠️ 此活动时间与其他活动冲突</span>
                        </div>
                      )}
                      <div><Label>类型</Label><Select value={activity.location_type} onValueChange={(v) => {
                        const newActs = [...activities];
                        newActs[i].location_type = v;
                        setActivities(newActs);
                      }}><SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent>
                        <SelectItem value="餐厅">餐厅</SelectItem>
                        <SelectItem value="咖啡厅">咖啡厅</SelectItem>
                        <SelectItem value="公园">公园</SelectItem>
                        <SelectItem value="电影院">电影院</SelectItem>
                        <SelectItem value="商场">商场</SelectItem>
                        <SelectItem value="Agent">Agent</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent></Select></div>
                      <div><Label>地点名称 *</Label><Input value={activity.location_name} onChange={(e) => {
                        const newActs = [...activities];
                        newActs[i].location_name = e.target.value;
                        setActivities(newActs);
                      }} placeholder="例如：星巴克" /></div>
                      <div><Label>详细地址</Label>
                        <div className="flex gap-2">
                          <Input value={activity.location_address} onChange={(e) => {
                            const newActs = [...activities];
                            newActs[i].location_address = e.target.value;
                            setActivities(newActs);
                          }} placeholder="例如：洛杉矶市中心大街123号" />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => handleFetchWeather(i)}
                            disabled={fetchingWeather === i}
                          >
                            {fetchingWeather === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {activity.weather_condition && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Cloud className="h-4 w-4" />
                          <span>{activity.weather_condition} {activity.temperature}</span>
                        </div>
                      )}
                      {activity.location_type === "餐厅" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>推荐菜品</Label>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleFetchRecommendations(i)}
                              disabled={fetchingRecommendations === i}
                            >
                              {fetchingRecommendations === i ? <Loader2 className="h-4 w-4 animate-spin" /> : "获取推荐"}
                            </Button>
                          </div>
                          {activity.recommended_dishes && (
                            <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                              {activity.recommended_dishes}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activity.location_type === "Agent" && (
                        <div className="space-y-3 border-t pt-3">
                          <div>
                            <Label>联系人名称</Label>
                            <Input 
                              value={activity.contact_name || ''} 
                              onChange={(e) => {
                                const newActs = [...activities];
                                newActs[i].contact_name = e.target.value;
                                setActivities(newActs);
                              }} 
                              placeholder="例如：张三" 
                            />
                          </div>
                          <div>
                            <Label>联系电话</Label>
                            <Input 
                              value={activity.contact_phone || ''} 
                              onChange={(e) => {
                                const newActs = [...activities];
                                newActs[i].contact_phone = e.target.value;
                                setActivities(newActs);
                              }} 
                              placeholder="例如：123-456-7890" 
                            />
                          </div>
                          <div>
                            <Label>Agent备注</Label>
                            <Textarea 
                              value={activity.agent_notes || ''} 
                              onChange={(e) => {
                                const newActs = [...activities];
                                newActs[i].agent_notes = e.target.value;
                                setActivities(newActs);
                              }} 
                              placeholder="Agent相关的备注信息..." 
                              rows={2} 
                            />
                          </div>
                        </div>
                      )}
                      
                      <div><Label>描述</Label><Textarea value={activity.description} onChange={(e) => {
                        const newActs = [...activities];
                        newActs[i].description = e.target.value;
                        setActivities(newActs);
                      }} placeholder="活动描述..." rows={2} /></div>
                      <div><Label>预计费用（美元）</Label><Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        value={activity.estimated_cost || ''} 
                        onChange={(e) => {
                          const newActs = [...activities];
                          newActs[i].estimated_cost = e.target.value ? parseFloat(e.target.value) : undefined;
                          setActivities(newActs);
                        }} 
                        placeholder="例如：50.00" 
                      /></div>

                      {/* Gift开关和支付人选择 */}
                      <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={activity.is_gift || false}
                            onCheckedChange={(checked) => {
                              const newActs = [...activities];
                              newActs[i].is_gift = checked;
                              if (checked) {
                                newActs[i].paid_by = undefined;
                              }
                              setActivities(newActs);
                            }}
                          />
                          <Label className="text-sm flex items-center gap-1">
                            <Gift className="h-4 w-4" />
                            这是请客（gift）
                          </Label>
                        </div>
                        {!activity.is_gift && userProfile && partnerProfile && (
                          <div className="flex-1">
                            <Select value={activity.paid_by || ''} onValueChange={(v) => {
                              const newActs = [...activities];
                              newActs[i].paid_by = v;
                              setActivities(newActs);
                            }}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="谁支付？" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={user?.id || ''}>{userProfile.nickname || '我'}</SelectItem>
                                <SelectItem value={relationship?.partner_id || ''}>{partnerProfile.nickname || 'TA'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  
                  {/* 总预算统计 */}
                  {activities.length > 0 && (
                    <Card className="p-4 bg-primary/5 border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">预计总费用</span>
                        <span className="text-2xl font-bold text-primary">
                          ${activities.reduce((sum, a) => sum + (a.estimated_cost || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* 预算分类统计 */}
                      {getBudgetByCategory().length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-primary/10">
                          <span className="text-sm font-medium text-muted-foreground">费用分布</span>
                          {getBudgetByCategory().map(({ category, cost, icon }) => (
                            <div key={category} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 flex items-center justify-center">
                                  {icon}
                                </div>
                                <span>{category}</span>
                              </div>
                              <span className="font-medium">${cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                  
                  <Button
                    type="button" 
                    variant="outline" 
                    onClick={handleAddActivity}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />添加活动
                  </Button>
                  <div ref={activitiesEndRef} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button onClick={handleSavePlan}>{editingPlan ? '保存' : '创建'}</Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">即将到来 ({upcomingPlans.length})</TabsTrigger>
            <TabsTrigger value="history">历史 ({historyPlans.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingPlans.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">暂无计划</p></Card> :
              upcomingPlans.map(p => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarHeart className="h-5 w-5" />
                        {format(parseDateInLA(p.plan_date), 'MM月dd日', { locale: zhCN })}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPlan(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {p.notes && <CardDescription>{p.notes}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 时间轴视图 */}
                    <div className="relative space-y-0">
                      {/* 时间轴线条 */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />
                      
                      {p.activities.map((a, index) => (
                        <div key={a.id} className="relative">
                          {/* 时间节点 */}
                          <div className="absolute left-3 top-5 z-10">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${
                              a.location_type === "餐厅" ? "bg-orange-500" :
                              a.location_type === "咖啡厅" ? "bg-amber-600" :
                              a.location_type === "公园" ? "bg-green-500" :
                              a.location_type === "电影院" ? "bg-purple-500" :
                              a.location_type === "商场" ? "bg-blue-500" :
                              a.location_type === "Agent" ? "bg-pink-500" :
                              "bg-muted"
                            }`}>
                              <div className="text-white">
                                {React.cloneElement(getActivityIcon(a.location_type) as React.ReactElement, { 
                                  className: "h-3.5 w-3.5 text-white" 
                                })}
                              </div>
                            </div>
                          </div>
                          
                          {/* 活动卡片 */}
                          <div className="ml-16 mb-6">
                            <div className={`rounded-lg p-4 shadow-sm border-l-4 space-y-2 transition-all hover:shadow-md ${
                              a.location_type === "餐厅" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20" :
                              a.location_type === "咖啡厅" ? "border-l-amber-600 bg-amber-50/50 dark:bg-amber-950/20" :
                              a.location_type === "公园" ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20" :
                              a.location_type === "电影院" ? "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20" :
                              a.location_type === "商场" ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20" :
                              a.location_type === "Agent" ? "border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20" :
                              "border-l-border bg-muted/20"
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {a.activity_time}
                                </Badge>
                                <span className="font-medium text-base">{a.location_name}</span>
                              </div>
                              
                              {/* 地址信息 */}
                              {a.location_address && (
                                <div className="flex items-start gap-2 group">
                                  <div className="text-sm text-muted-foreground flex-1">
                                    📍 {a.location_address}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCopyToClipboard(a.location_address!, '地址')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              
                              {/* 电话信息 */}
                              {a.contact_phone && (
                                <div className="flex items-center gap-2 group">
                                  <a 
                                    href={`tel:${a.contact_phone}`}
                                    className="flex items-center gap-2 text-sm text-primary hover:underline flex-1"
                                  >
                                    <Phone className="h-3 w-3" />
                                    <span>{a.contact_phone}</span>
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleCopyToClipboard(a.contact_phone!, '电话')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              
                              {a.weather_condition && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Cloud className="h-4 w-4" />
                                  <span>{a.weather_condition} {a.temperature}</span>
                                </div>
                              )}
                              
                              {a.recommended_dishes && (
                                <div className="mt-2 p-2 bg-background/50 rounded text-xs whitespace-pre-wrap">
                                  <span className="font-medium">推荐菜品：</span>
                                  <div className="mt-1">{a.recommended_dishes}</div>
                                </div>
                              )}
                              
                              {a.description && (
                                <p className="text-sm text-muted-foreground">{a.description}</p>
                              )}
                              
                              {a.estimated_cost !== undefined && a.estimated_cost > 0 && (
                                <p className="text-sm font-medium text-primary">${a.estimated_cost.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 总预算显示 */}
                    {p.activities.some(a => a.estimated_cost && a.estimated_cost > 0) && (
                      <div className="pt-3 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">预计总费用</span>
                          <span className="text-lg font-bold text-primary">
                            ${p.activities.reduce((sum, a) => sum + (a.estimated_cost || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* 预算分类统计 */}
                        {getPlanBudgetByCategory(p).length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">费用分布</span>
                            <div className="grid grid-cols-2 gap-2">
                              {getPlanBudgetByCategory(p).map(({ category, cost, icon }) => (
                                <div key={category} className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    {icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{category}</div>
                                    <div className="text-primary">${cost.toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button
                      onClick={async () => {
                        try {
                          const { error } = await (supabase as any)
                            .from('date_plans' as any)
                            .update({ is_completed: true })
                            .eq('id', p.id);
                          
                          if (error) throw error;
                          
                          toast.success('已标记为完成！');
                          fetchPlans();
                        } catch (error: any) {
                          toast.error('标记失败：' + error.message);
                        }
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      标记为完成
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
          <TabsContent value="history" className="space-y-4 mt-6">
            {historyPlans.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">暂无历史记录</p>
              </Card>
            ) : (
              historyPlans.map(p => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarHeart className="h-5 w-5" />
                        {format(parseDateInLA(p.plan_date), 'MM月dd日', { locale: zhCN })}
                      </CardTitle>
                      <Badge variant={p.is_completed ? "default" : "secondary"}>
                        {p.is_completed ? "已完成" : "未完成"}
                      </Badge>
                    </div>
                    {p.notes && <CardDescription>{p.notes}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {p.activities.map((a, index) => (
                        <div key={a.id} className={`border-l-2 pl-4 py-2 rounded-r-lg space-y-3 ${getActivityColorClasses(a.location_type)}`}>
                          <div className="flex items-start gap-2">
                            {getActivityIcon(a.location_type)}
                            <span className="text-sm font-medium">
                              活动 {index + 1}
                            </span>
                            {a.activity_time && (
                              <span className="text-sm text-muted-foreground">
                                🕐 {a.activity_time}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{a.location_name}</p>
                            {a.location_address && (
                              <div className="flex items-start gap-2 group">
                                <p className="text-sm text-muted-foreground flex-1">
                                  📍 {a.location_address}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleCopyToClipboard(a.location_address!, '地址')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {a.description && (
                              <p className="text-sm text-muted-foreground">
                                {a.description}
                              </p>
                            )}
                            {a.weather_condition && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Cloud className="h-4 w-4" />
                                <span>{a.weather_condition} {a.temperature}</span>
                              </div>
                            )}
                            {a.recommended_dishes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs whitespace-pre-wrap">
                                <span className="font-medium">推荐：</span>
                                <div className="mt-1">{a.recommended_dishes}</div>
                              </div>
                            )}
                            
                            {/* Agent信息 */}
                            {(a.agent_notes || a.contact_name || a.contact_phone) && (
                              <div className="mt-2 p-3 bg-primary/5 border border-primary/10 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                                  <Bot className="h-4 w-4" />
                                  <span>Agent信息</span>
                                </div>
                                {a.contact_name && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">联系人：</span>
                                    <span className="font-medium">{a.contact_name}</span>
                                  </div>
                                )}
                                {a.contact_phone && (
                                  <div className="flex items-center gap-2 group">
                                    <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm flex-1">{a.contact_phone}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleCopyToClipboard(a.contact_phone!, '电话')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {a.agent_notes && (
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.agent_notes}</p>
                                )}
                              </div>
                            )}
                            
                            {a.activity_rating && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-yellow-500">
                                  {"⭐".repeat(a.activity_rating)}
                                </span>
                              </div>
                            )}

                            {a.activity_notes && (
                              <p className="text-sm mt-2 p-2 bg-muted/30 rounded">{a.activity_notes}</p>
                            )}

                            {a.activity_photos && a.activity_photos.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {a.activity_photos.map((photo, idx) => (
                                  <img key={idx} src={photo} alt={`照片 ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                                ))}
                              </div>
                            )}
                            
                            {a.estimated_cost !== undefined && a.estimated_cost > 0 && (
                              <p className="text-sm font-medium text-primary mt-2">${a.estimated_cost.toFixed(2)}</p>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedActivity(a);
                              setActivityDetailsDialogOpen(true);
                            }}
                            className="w-full"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            编辑活动详情
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* 总预算显示 */}
                    {p.activities.some(a => a.estimated_cost && a.estimated_cost > 0) && (
                      <div className="pt-3 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">实际总费用</span>
                          <span className="text-lg font-bold text-primary">
                            ${p.activities.reduce((sum, a) => sum + (a.estimated_cost || 0), 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* 预算分类统计 */}
                        {getPlanBudgetByCategory(p).length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">费用分布</span>
                            <div className="grid grid-cols-2 gap-2">
                              {getPlanBudgetByCategory(p).map(({ category, cost, icon }) => (
                                <div key={category} className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    {icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{category}</div>
                                    <div className="text-primary">${cost.toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 账单分摊显示 */}
                    {calculateBillSplit(p) && calculateBillSplit(p)!.totalCost > 0 && (
                      <div className="pt-3 border-t space-y-2">
                        <span className="text-xs font-medium text-muted-foreground">账单分摊</span>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>{userProfile?.nickname || '我'} 应付:</span>
                            <span className="font-medium">${calculateBillSplit(p)?.userShare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{partnerProfile?.nickname || 'TA'} 应付:</span>
                            <span className="font-medium">${calculateBillSplit(p)?.partnerShare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span>{userProfile?.nickname || '我'} 已付:</span>
                            <span className="font-medium">${calculateBillSplit(p)?.userPaid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{partnerProfile?.nickname || 'TA'} 已付:</span>
                            <span className="font-medium">${calculateBillSplit(p)?.partnerPaid.toFixed(2)}</span>
                          </div>
                          {calculateBillSplit(p)!.userBalance !== 0 && (
                            <div className="flex justify-between pt-1 border-t font-medium">
                              {calculateBillSplit(p)!.userBalance > 0 ? (
                                <span className="text-green-600">{partnerProfile?.nickname || 'TA'} 欠 {userProfile?.nickname || '我'}: ${Math.abs(calculateBillSplit(p)!.userBalance).toFixed(2)}</span>
                              ) : (
                                <span className="text-red-600">{userProfile?.nickname || '我'} 欠 {partnerProfile?.nickname || 'TA'}: ${Math.abs(calculateBillSplit(p)!.userBalance).toFixed(2)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={async () => {
                          try {
                            const { error } = await (supabase as any)
                              .from('date_plans' as any)
                              .update({ is_completed: false })
                              .eq('id', p.id);
                            
                            if (error) throw error;
                            
                            toast.success('已标记为未完成，移回到即将到来！');
                            fetchPlans();
                          } catch (error: any) {
                            toast.error('操作失败：' + error.message);
                          }
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        标记为未完成
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          try {
                            // Create new plan with future date
                            const nextWeekend = new Date();
                            nextWeekend.setDate(nextWeekend.getDate() + ((6 - nextWeekend.getDay() + 7) % 7 || 7));
                            
                            const { data: newPlan, error: planError } = await (supabase as any)
                              .from('date_plans' as any)
                              .insert({
                                relationship_id: relationshipId,
                                plan_date: formatDateInLA(nextWeekend),
                                notes: p.notes,
                                is_completed: false
                              })
                              .select()
                              .single();
                            
                            if (planError) throw planError;
                            
                            // Copy activities
                            const newActivities = p.activities.map((a: Activity, index: number) => ({
                              plan_id: newPlan.id,
                              activity_time: a.activity_time,
                              location_name: a.location_name,
                              location_address: a.location_address,
                              location_type: a.location_type,
                              description: a.description,
                              weather_condition: a.weather_condition,
                              temperature: a.temperature,
                              recommended_dishes: a.recommended_dishes,
                              order_index: index
                            }));
                            
                            const { error: activitiesError } = await (supabase as any)
                              .from('date_plan_activities' as any)
                              .insert(newActivities as any);
                            
                            if (activitiesError) throw activitiesError;
                            
                            toast.success('已基于历史计划创建新计划！');
                            fetchPlans();
                          } catch (error: any) {
                            toast.error('创建失败：' + error.message);
                          }
                        }}
                        variant="default"
                        className="flex-1"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                      基于此创建新计划
                    </Button>
                  </div>
                  
                  {/* 生成约会日记和查看报告按钮 */}
                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedPlanForReport({ id: p.id, date: p.plan_date } as any);
                        setDatePlanReportDialogOpen(true);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      查看报告
                    </Button>
                    <Button
                      onClick={() => handleGenerateDiary(p.id)}
                      disabled={generatingDiary === p.id}
                      className="flex-1"
                    >
                      {generatingDiary === p.id ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />生成中</>
                      ) : (
                        <><BookHeart className="h-4 w-4 mr-2" />生成日记</>
                      )}
                    </Button>
                  </div>
                  
                </CardContent>
              </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      <MobileNav />
      
      {selectedActivity && (
        <ActivityDetailsDialog
          open={activityDetailsDialogOpen}
          onOpenChange={setActivityDetailsDialogOpen}
          activity={selectedActivity}
          onSaved={fetchPlans}
        />
      )}

      {selectedPlanForReport && (
        <DatePlanReportDialog
          open={datePlanReportDialogOpen}
          onOpenChange={setDatePlanReportDialogOpen}
          planId={selectedPlanForReport.id}
          planDate={selectedPlanForReport.date}
          onReportGenerated={fetchPlans}
        />
      )}
    </div>
  );
};

export default WeekendPlans;
