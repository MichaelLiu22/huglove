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
import { ArrowLeft, CalendarHeart, MapPin, Plus, Check, Cloud, Sun, CloudRain } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MobileNav } from "@/components/MobileNav";

interface DatePlan {
  id: string;
  suggestion_date: string;
  location_name: string;
  location_type: string;
  description: string;
  weather_condition: string;
  temperature: string;
  is_completed: boolean;
  reason: string;
}

const WeekendPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upcomingPlans, setUpcomingPlans] = useState<DatePlan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<DatePlan[]>([]);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form states
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("");
  const [description, setDescription] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (user) {
      fetchRelationship();
    }
  }, [user]);

  useEffect(() => {
    if (relationshipId) {
      fetchPlans();
    }
  }, [relationshipId]);

  const fetchRelationship = async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setRelationshipId(data.id);
    } catch (error) {
      console.error('Error fetching relationship:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('date_suggestions')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('suggestion_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = data?.filter(plan => 
        !plan.is_completed && new Date(plan.suggestion_date) >= today
      ) || [];

      const history = data?.filter(plan => 
        plan.is_completed || new Date(plan.suggestion_date) < today
      ) || [];

      setUpcomingPlans(upcoming);
      setHistoryPlans(history);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('获取约会计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async () => {
    if (!selectedDate || !locationName || !locationType) {
      toast.error('请填写必要信息');
      return;
    }

    try {
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { error } = await supabase
        .from('date_suggestions')
        .insert({
          relationship_id: relationshipId,
          suggestion_date: formatLocalDate(selectedDate),
          location_name: locationName,
          location_type: locationType,
          description: description,
          weather_condition: weather,
          temperature: temperature,
          reason: reason,
          is_completed: false
        });

      if (error) throw error;

      toast.success('约会计划已添加');
      setIsDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error adding plan:', error);
      toast.error('添加约会计划失败');
    }
  };

  const handleToggleComplete = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('date_suggestions')
        .update({ is_completed: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      toast.success(currentStatus ? '已标记为未完成' : '已标记为完成');
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('更新失败');
    }
  };

  const resetForm = () => {
    setSelectedDate(undefined);
    setLocationName("");
    setLocationType("");
    setDescription("");
    setWeather("");
    setTemperature("");
    setReason("");
  };

  const getWeatherIcon = (condition: string) => {
    if (condition?.includes('晴')) return <Sun className="h-4 w-4" />;
    if (condition?.includes('雨')) return <CloudRain className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  const getLocationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '餐厅': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      '公园': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '电影院': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '购物中心': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '咖啡厅': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      '其他': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    return colors[type] || colors['其他'];
  };

  const PlanCard = ({ plan, showCompleteButton = true }: { plan: DatePlan; showCompleteButton?: boolean }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarHeart className="h-5 w-5 text-primary" />
              {format(new Date(plan.suggestion_date), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <MapPin className="h-4 w-4" />
              {plan.location_name}
            </CardDescription>
          </div>
          {showCompleteButton && (
            <Button
              size="sm"
              variant={plan.is_completed ? "secondary" : "default"}
              onClick={() => handleToggleComplete(plan.id, plan.is_completed)}
            >
              <Check className="h-4 w-4 mr-1" />
              {plan.is_completed ? '已完成' : '标记完成'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getLocationTypeColor(plan.location_type)}>
            {plan.location_type}
          </Badge>
          {plan.weather_condition && (
            <Badge variant="outline" className="flex items-center gap-1">
              {getWeatherIcon(plan.weather_condition)}
              {plan.weather_condition}
              {plan.temperature && ` ${plan.temperature}`}
            </Badge>
          )}
        </div>
        {plan.reason && (
          <p className="text-sm text-muted-foreground mt-2">
            💭 {plan.reason}
          </p>
        )}
        {plan.description && (
          <p className="text-sm text-foreground mt-2">
            {plan.description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
            <CardDescription>查看约会计划需要登录账号</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="md:flex hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">周末约会计划</h1>
              <p className="text-muted-foreground text-sm mt-1">
                规划美好时光，创造甜蜜回忆
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加计划
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>添加约会计划</DialogTitle>
                <DialogDescription>
                  填写约会详情，为美好时光做准备
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">约会日期 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarHeart className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN }) : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">地点名称 *</Label>
                  <Input
                    id="location"
                    placeholder="例如：中央公园、意大利餐厅"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">地点类型 *</Label>
                  <Select value={locationType} onValueChange={setLocationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="餐厅">餐厅</SelectItem>
                      <SelectItem value="公园">公园</SelectItem>
                      <SelectItem value="电影院">电影院</SelectItem>
                      <SelectItem value="购物中心">购物中心</SelectItem>
                      <SelectItem value="咖啡厅">咖啡厅</SelectItem>
                      <SelectItem value="博物馆">博物馆</SelectItem>
                      <SelectItem value="游乐场">游乐场</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">约会理由</Label>
                  <Input
                    id="reason"
                    placeholder="例如：庆祝纪念日、天气很好"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weather">天气</Label>
                    <Input
                      id="weather"
                      placeholder="晴天、多云"
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">温度</Label>
                    <Input
                      id="temperature"
                      placeholder="22°C"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">详细描述</Label>
                  <Textarea
                    id="description"
                    placeholder="添加更多细节..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddPlan}>添加计划</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upcoming">
              即将到来 ({upcomingPlans.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              历史记录 ({historyPlans.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                加载中...
              </div>
            ) : upcomingPlans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarHeart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    还没有计划的约会
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加第一个计划
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} showCompleteButton={true} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                加载中...
              </div>
            ) : historyPlans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarHeart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    还没有历史约会记录
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {historyPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} showCompleteButton={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MobileNav userId={user?.id} />
    </div>
  );
};

export default WeekendPlans;
