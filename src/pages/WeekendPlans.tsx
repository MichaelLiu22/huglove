import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { ArrowLeft, CalendarHeart, MapPin, Plus, Check, Cloud, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MobileNav } from "@/components/MobileNav";
import { formatDateInLA, parseDateInLA, toLATime } from "@/lib/timezoneUtils";

interface Activity {
  id?: string;
  activity_time: string;
  location_name: string;
  location_type: string;
  description: string;
  weather_condition?: string;
  temperature?: string;
  order_index: number;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<Activity[]>([
    { activity_time: "09:00", location_name: "", location_type: "", description: "", order_index: 0 }
  ]);

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
      const { data: plansData } = await supabase.from('date_plans').select('*').eq('relationship_id', relationshipId).order('plan_date', { ascending: true });
      
      const plansWithActivities = await Promise.all((plansData || []).map(async (plan) => {
        const { data: activitiesData } = await supabase.from('date_plan_activities').select('*').eq('plan_id', plan.id).order('order_index');
        return { ...plan, activities: activitiesData || [] };
      }));

      const today = toLATime(new Date());
      today.setHours(0, 0, 0, 0);
      setUpcomingPlans(plansWithActivities.filter(p => !p.is_completed && parseDateInLA(p.plan_date) >= today));
      setHistoryPlans(plansWithActivities.filter(p => p.is_completed || parseDateInLA(p.plan_date) < today));
    } catch (error) {
      toast.error('获取计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = () => {
    setActivities([...activities, { activity_time: "", location_name: "", location_type: "", description: "", order_index: activities.length }]);
  };

  const handleAddPlan = async () => {
    if (!selectedDate || activities.filter(a => a.location_name.trim()).length === 0) {
      toast.error('请填写必要信息');
      return;
    }

    try {
      const { data: planData } = await supabase.from('date_plans').insert({
        relationship_id: relationshipId,
        plan_date: formatDateInLA(selectedDate),
        notes,
        is_completed: false
      }).select().single();

      await supabase.from('date_plan_activities').insert(
        activities.filter(a => a.location_name.trim()).map((a, i) => ({ plan_id: planData!.id, ...a, order_index: i }))
      );

      toast.success('计划已添加');
      setIsDialogOpen(false);
      setSelectedDate(undefined);
      setNotes("");
      setActivities([{ activity_time: "09:00", location_name: "", location_type: "", description: "", order_index: 0 }]);
      fetchPlans();
    } catch (error) {
      toast.error('添加失败');
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-white"><Plus className="h-4 w-4 mr-2" />添加计划</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建约会计划</DialogTitle>
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
                    <Button type="button" size="sm" variant="outline" onClick={handleAddActivity}><Plus className="h-4 w-4 mr-1" />添加活动</Button>
                  </div>

                  {activities.map((activity, i) => (
                    <Card key={i} className="p-4 space-y-4">
                      <div className="flex justify-between"><span className="font-medium text-sm">活动 {i + 1}</span></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>时间</Label><Input type="time" value={activity.activity_time} onChange={(e) => {
                          const newActs = [...activities];
                          newActs[i].activity_time = e.target.value;
                          setActivities(newActs);
                        }} /></div>
                        <div><Label>类型</Label><Select value={activity.location_type} onValueChange={(v) => {
                          const newActs = [...activities];
                          newActs[i].location_type = v;
                          setActivities(newActs);
                        }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="餐厅">餐厅</SelectItem>
                          <SelectItem value="咖啡厅">咖啡厅</SelectItem>
                          <SelectItem value="公园">公园</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent></Select></div>
                      </div>
                      <div><Label>地点 *</Label><Input value={activity.location_name} onChange={(e) => {
                        const newActs = [...activities];
                        newActs[i].location_name = e.target.value;
                        setActivities(newActs);
                      }} /></div>
                    </Card>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button onClick={handleAddPlan}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">即将到来 ({upcomingPlans.length})</TabsTrigger>
            <TabsTrigger value="history">历史 ({historyPlans.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingPlans.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">暂无计划</p></Card> :
              upcomingPlans.map(p => <Card key={p.id}><CardHeader><CardTitle className="flex items-center gap-2"><CalendarHeart className="h-5 w-5" />{format(parseDateInLA(p.plan_date), 'MM月dd日', { locale: zhCN })}</CardTitle></CardHeader><CardContent>{p.activities.map(a => <div key={a.id} className="border-l-2 pl-4 mb-2"><div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{a.location_name}</span></div></div>)}</CardContent></Card>)}
          </TabsContent>
          <TabsContent value="history" className="space-y-4 mt-6">
            {historyPlans.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">暂无历史</p></Card> : null}
          </TabsContent>
        </Tabs>
      </div>
      <MobileNav />
    </div>
  );
};

export default WeekendPlans;
