import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Plus, Trash2, Loader2, Navigation, Info, AlertCircle, Car, Calendar, FileDown, Share2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RouteMapView } from "./RouteMapView";
import jsPDF from "jspdf";

interface Location {
  id: string;
  name: string;
  address: string;
  type: string;
  priority: 'must_go' | 'chill';
  estimatedDuration: number;
  lat?: number;
  lng?: number;
}

interface OptimizedActivity {
  orderIndex: number;
  locationName: string;
  locationAddress: string;
  locationType: string;
  latitude: number | null;
  longitude: number | null;
  activityTime: string;
  activityEndTime: string;
  estimatedDuration: number;
  travelTimeFromPrevious: number;
  priority: string;
  isAutoScheduled: boolean;
  description?: string;
  recommendedDishes?: string;
}

interface SmartRoutePlannerProps {
  onSaveRoute: (activities: OptimizedActivity[], summary: any) => void;
  onCancel: () => void;
  selectedDate?: Date;
}

const activityTypes = [
  { value: "餐厅", label: "餐厅", icon: "🍽️" },
  { value: "景点", label: "景点", icon: "🏛️" },
  { value: "公园", label: "公园", icon: "🌳" },
  { value: "购物", label: "购物", icon: "🛍️" },
  { value: "电影", label: "电影", icon: "🎬" },
  { value: "咖啡厅", label: "咖啡厅", icon: "☕" },
  { value: "其他", label: "其他", icon: "📍" },
];

export function SmartRoutePlanner({ onSaveRoute, onCancel, selectedDate }: SmartRoutePlannerProps) {
  const [startAddress, setStartAddress] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endAddress, setEndAddress] = useState("");
  const [endTime, setEndTime] = useState("19:00");
  const [places, setPlaces] = useState<Location[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedActivity[] | null>(null);
  const [skippedPlaces, setSkippedPlaces] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const mapboxToken = "pk.eyJ1IjoibWljaGFlbHhsaXUyMiIsImEiOiJjbWkzdmMzc3Exd3A0Mmpvc2M5eTBiZnVyIn0.Es59RAcZ7DgaGYyoRlNdJg";

  const handleAddPlace = () => {
    const newPlace: Location = {
      id: `temp-${Date.now()}`,
      name: "",
      address: "",
      type: "餐厅",
      priority: "must_go",
      estimatedDuration: 60,
    };
    setPlaces([...places, newPlace]);
  };

  const handleRemovePlace = (id: string) => {
    setPlaces(places.filter(p => p.id !== id));
  };

  const handleUpdatePlace = (id: string, field: keyof Location, value: any) => {
    setPlaces(places.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleOptimize = async () => {
    if (!startAddress.trim()) {
      toast.error("请输入起点地址");
      return;
    }
    if (!endAddress.trim()) {
      toast.error("请输入终点地址");
      return;
    }
    if (places.length === 0) {
      toast.error("请至少添加一个地点");
      return;
    }
    
    const invalidPlaces = places.filter(p => !p.name.trim() || !p.address.trim());
    if (invalidPlaces.length > 0) {
      toast.error("请填写所有地点的名称和地址");
      return;
    }

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-date-route', {
        body: {
          startLocation: startAddress,
          endLocation: endAddress,
          startTime,
          endTime,
          places: places.map(p => ({
            name: p.name,
            address: p.address,
            type: p.type,
            priority: p.priority,
            estimatedDuration: p.estimatedDuration
          })),
          date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      setOptimizedRoute(data.optimizedRoute);
      setSkippedPlaces(data.skippedPlaces || []);
      setSummary(data.summary);
      toast.success("路线优化完成！");
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error(error.message || "优化失败，请重试");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = () => {
    if (optimizedRoute && summary) {
      onSaveRoute(optimizedRoute, summary);
    }
  };

  const handleExportPDF = async () => {
    if (!optimizedRoute || !summary) return;
    
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;
      
      pdf.setFontSize(20);
      pdf.text("约会路线规划", pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      if (selectedDate) {
        pdf.setFontSize(12);
        pdf.text(`日期: ${selectedDate.toLocaleDateString('zh-CN')}`, 20, yPos);
        yPos += 10;
      }
      
      pdf.setFontSize(14);
      pdf.text("行程概览", 20, yPos);
      yPos += 8;
      pdf.setFontSize(10);
      pdf.text(`总距离: ${summary.totalDistance} km`, 20, yPos);
      yPos += 6;
      pdf.text(`总行驶时间: ${summary.totalDrivingTime} 分钟`, 20, yPos);
      yPos += 6;
      pdf.text(`总游玩时间: ${summary.totalActivityTime} 分钟`, 20, yPos);
      yPos += 6;
      pdf.text(`预计结束时间: ${summary.estimatedEndTime}`, 20, yPos);
      yPos += 12;
      
      pdf.setFontSize(14);
      pdf.text("详细行程", 20, yPos);
      yPos += 8;
      
      optimizedRoute.forEach((activity, index) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFontSize(12);
        pdf.text(`${index + 1}. ${activity.locationName}`, 20, yPos);
        yPos += 6;
        
        pdf.setFontSize(9);
        pdf.text(`地址: ${activity.locationAddress}`, 25, yPos);
        yPos += 5;
        pdf.text(`时间: ${activity.activityTime} - ${activity.activityEndTime}`, 25, yPos);
        yPos += 5;
        pdf.text(`停留时长: ${activity.estimatedDuration} 分钟`, 25, yPos);
        yPos += 5;
        
        if (activity.travelTimeFromPrevious > 0) {
          pdf.text(`行驶时间: ${activity.travelTimeFromPrevious} 分钟`, 25, yPos);
          yPos += 5;
        }
        
        if (activity.description) {
          const lines = pdf.splitTextToSize(`描述: ${activity.description}`, pageWidth - 50);
          pdf.text(lines, 25, yPos);
          yPos += lines.length * 5;
        }
        
        if (activity.recommendedDishes) {
          const lines = pdf.splitTextToSize(`推荐菜品: ${activity.recommendedDishes}`, pageWidth - 50);
          pdf.text(lines, 25, yPos);
          yPos += lines.length * 5;
        }
        
        yPos += 8;
      });
      
      if (skippedPlaces.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text("跳过的地点", 20, yPos);
        yPos += 8;
        
        skippedPlaces.forEach((place) => {
          pdf.setFontSize(10);
          pdf.text(`• ${place.name} - ${place.reason}`, 25, yPos);
          yPos += 6;
        });
      }
      
      const dateStr = selectedDate ? selectedDate.toLocaleDateString('zh-CN').replace(/\//g, '-') : 'route';
      pdf.save(`约会路线_${dateStr}.pdf`);
      toast.success("PDF已导出");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const handleShareWithPartner = async () => {
    if (!optimizedRoute || !summary) return;
    
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("请先登录");
        return;
      }
      
      const { data: relationship } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!relationship?.partner_id) {
        toast.error("您还没有关联伴侣");
        return;
      }
      
      const dateStr = selectedDate ? selectedDate.toLocaleDateString('zh-CN') : '未指定日期';
      await supabase
        .from('notifications')
        .insert({
          user_id: relationship.partner_id,
          relationship_id: relationship.id,
          notification_type: 'date_plan',
          title: '新的约会路线',
          message: `您的伴侣分享了一个约会路线计划（${dateStr}），包含 ${optimizedRoute.length} 个地点，预计需要 ${summary.totalActivityTime} 分钟。`,
          link: '/weekend-plans'
        });
      
      toast.success("已发送给伴侣");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("分享失败，请重试");
    } finally {
      setSharing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'must_go' ? 'bg-primary' : 'bg-secondary';
  };

  return (
    <div className="space-y-6">
      {!optimizedRoute && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>智能路线规划</CardTitle>
              <CardDescription>
                输入起点、终点和想去的地点，我们将为您规划最优路线
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-address">起点地址</Label>
                  <Input
                    id="start-address"
                    placeholder="输入起点地址"
                    value={startAddress}
                    onChange={(e) => setStartAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time">出发时间</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-address">终点地址</Label>
                  <Input
                    id="end-address"
                    placeholder="输入终点地址"
                    value={endAddress}
                    onChange={(e) => setEndAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">结束时间</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>添加地点</Label>
                  <Button onClick={handleAddPlace} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </Button>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {places.map((place) => (
                      <Card key={place.id}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>地点 {places.indexOf(place) + 1}</Label>
                            <Button
                              onClick={() => handleRemovePlace(place.id)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <Input
                            placeholder="地点名称"
                            value={place.name}
                            onChange={(e) => handleUpdatePlace(place.id, 'name', e.target.value)}
                          />

                          <Input
                            placeholder="地点地址"
                            value={place.address}
                            onChange={(e) => handleUpdatePlace(place.id, 'address', e.target.value)}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">地点类型</Label>
                              <Select
                                value={place.type}
                                onValueChange={(value) => handleUpdatePlace(place.id, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {activityTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.icon} {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs">优先级</Label>
                              <Select
                                value={place.priority}
                                onValueChange={(value: 'must_go' | 'chill') => handleUpdatePlace(place.id, 'priority', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="must_go">必去</SelectItem>
                                  <SelectItem value="chill">休闲</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">停留时长 ({place.estimatedDuration} 分钟)</Label>
                            <Slider
                              value={[place.estimatedDuration]}
                              onValueChange={(value) => handleUpdatePlace(place.id, 'estimatedDuration', value[0])}
                              min={15}
                              max={240}
                              step={15}
                              className="mt-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleOptimize} disabled={optimizing} className="flex-1">
              {optimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  优化中...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  智能排序
                </>
              )}
            </Button>
            <Button onClick={onCancel} variant="outline">
              取消
            </Button>
          </div>
        </>
      )}

      {optimizedRoute && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                优化后的路线
              </CardTitle>
              <CardDescription>
                根据您的地点和时间安排，我们为您规划了最佳路线
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mapboxToken && (
                <RouteMapView
                  locations={optimizedRoute.map(act => ({
                    name: act.locationName,
                    address: act.locationAddress,
                    latitude: act.latitude,
                    longitude: act.longitude,
                    orderIndex: act.orderIndex,
                    locationType: act.locationType,
                  }))}
                  mapboxToken={mapboxToken}
                />
              )}

              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.totalDistance} km</div>
                    <div className="text-sm text-muted-foreground">总距离</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.totalDrivingTime} 分钟</div>
                    <div className="text-sm text-muted-foreground">总行驶时间</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.totalActivityTime} 分钟</div>
                    <div className="text-sm text-muted-foreground">总游玩时间</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.estimatedEndTime}</div>
                    <div className="text-sm text-muted-foreground">预计结束</div>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 p-4">
                  {optimizedRoute.map((activity, index) => (
                    <div key={index} className="relative">
                      {activity.travelTimeFromPrevious > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 ml-8">
                          <Car className="h-4 w-4" />
                          <span>行驶 {activity.travelTimeFromPrevious} 分钟</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full ${getPriorityColor(activity.priority)} flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          {index < optimizedRoute.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>

                        <Card className="flex-1">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {activity.locationName}
                                </div>
                                <div className="text-sm text-muted-foreground">{activity.locationAddress}</div>
                              </div>
                              <Badge variant={activity.isAutoScheduled ? 'secondary' : 'outline'} className="text-xs">
                                {activity.isAutoScheduled ? '自动安排' : '手动'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{activity.activityTime} - {activity.activityEndTime}</span>
                              </div>
                              <span className="text-muted-foreground">
                                停留 {activity.estimatedDuration} 分钟
                              </span>
                            </div>

                            {activity.description && (
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            )}

                            {activity.recommendedDishes && (
                              <div className="text-sm">
                                <span className="font-medium">推荐菜品：</span>
                                <span className="text-muted-foreground">{activity.recommendedDishes}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {skippedPlaces.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">以下地点因不顺路已跳过：</p>
                    <ul className="space-y-1">
                      {skippedPlaces.map((place, idx) => (
                        <li key={idx} className="text-sm">
                          • {place.name} - {place.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                保存为约会计划
              </Button>
              <Button onClick={handleExportPDF} disabled={exporting} variant="outline">
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                导出PDF
              </Button>
              <Button onClick={handleShareWithPartner} disabled={sharing} variant="outline">
                {sharing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                分享给伴侣
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setOptimizedRoute(null)} variant="outline" className="flex-1">
                重新规划
              </Button>
              <Button onClick={onCancel} variant="ghost" className="flex-1">
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
