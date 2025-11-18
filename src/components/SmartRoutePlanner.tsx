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
import { MapPin, Clock, Plus, Trash2, Loader2, Navigation, Info, AlertCircle, Car, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RouteMapView } from "./RouteMapView";

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
  const [mapboxToken, setMapboxToken] = useState("");

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
    // Validation
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
    setOptimizedRoute(null);
    setSkippedPlaces([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-date-route', {
        body: {
          startPoint: {
            address: startAddress,
            time: startTime,
          },
          endPoint: {
            address: endAddress,
            time: endTime,
          },
          places: places.map(p => ({
            name: p.name,
            address: p.address,
            type: p.type,
            priority: p.priority,
            estimatedDuration: p.estimatedDuration,
            lat: p.lat,
            lng: p.lng,
          })),
          planDate: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        },
      });

      if (error) throw error;

      if (data.success) {
        setOptimizedRoute(data.optimizedRoute);
        setSkippedPlaces(data.skippedPlaces || []);
        setSummary(data.summary);
        toast.success("路线优化成功！");
      } else {
        throw new Error(data.error || "路线优化失败");
      }
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error(error.message || "路线优化失败，请重试");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = () => {
    if (optimizedRoute && summary) {
      onSaveRoute(optimizedRoute, summary);
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'must_go' ? 'bg-red-500' : 'bg-yellow-500';
  };

  const getTypeIcon = (type: string) => {
    const found = activityTypes.find(t => t.value === type);
    return found?.icon || "📍";
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!optimizedRoute && (
        <>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-address">起点地址</Label>
                <Input
                  id="start-address"
                  placeholder="例: 123 Main St, Los Angeles, CA"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="end-address">终点地址</Label>
                <Input
                  id="end-address"
                  placeholder="例: 456 Oak St, Los Angeles, CA"
                  value={endAddress}
                  onChange={(e) => setEndAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">预计结束时间</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Places List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">约会地点</Label>
              <Button onClick={handleAddPlace} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                添加地点
              </Button>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>必去</strong>地点会优先安排，<strong>Chill</strong>地点如果不顺路会被跳过。系统会在午餐（12-1点）和晚餐（5:30-7点）时间自动推荐附近餐厅。
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                {places.map((place, index) => (
                  <Card key={place.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          <Badge variant={place.priority === 'must_go' ? 'destructive' : 'secondary'} className="text-xs">
                            {place.priority === 'must_go' ? '🔴 必去' : '🟡 Chill'}
                          </Badge>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePlace(place.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3">
                        <div className="space-y-2">
                          <Label>地点名称</Label>
                          <Input
                            placeholder="例: 格里菲斯天文台"
                            value={place.name}
                            onChange={(e) => handleUpdatePlace(place.id, 'name', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>地址</Label>
                          <Input
                            placeholder="例: 2800 E Observatory Rd, Los Angeles, CA 90027"
                            value={place.address}
                            onChange={(e) => handleUpdatePlace(place.id, 'address', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>类型</Label>
                            <Select
                              value={place.type}
                              onValueChange={(value) => handleUpdatePlace(place.id, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {activityTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>优先级</Label>
                            <Select
                              value={place.priority}
                              onValueChange={(value: 'must_go' | 'chill') => handleUpdatePlace(place.id, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="must_go">🔴 必去</SelectItem>
                                <SelectItem value="chill">🟡 Chill</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>预计停留时间: {place.estimatedDuration} 分钟</Label>
                          <Slider
                            value={[place.estimatedDuration]}
                            onValueChange={([value]) => handleUpdatePlace(place.id, 'estimatedDuration', value)}
                            min={15}
                            max={240}
                            step={15}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {places.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>还没有添加地点</p>
                    <p className="text-sm">点击上方"添加地点"按钮开始</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

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

      {/* Results Section */}
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
              {/* Map View */}
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
              
              {!mapboxToken && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>请输入 Mapbox Access Token 以显示地图</p>
                      <Input
                        placeholder="pk.eyJ1..."
                        value={mapboxToken}
                        onChange={(e) => setMapboxToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        在 <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">Mapbox Dashboard</a> 获取您的 Access Token
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary */}
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

              {/* Timeline */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 p-4">
                  {optimizedRoute.map((activity, index) => (
                    <div key={index} className="relative">
                      {/* Travel Time Indicator */}
                      {activity.travelTimeFromPrevious > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 ml-8">
                          <Car className="h-4 w-4" />
                          <span>行驶 {activity.travelTimeFromPrevious} 分钟</span>
                        </div>
                      )}

                      {/* Activity Card */}
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
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getTypeIcon(activity.locationType)}</span>
                                    <h4 className="font-semibold">{activity.locationName}</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{activity.locationAddress}</p>
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
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Skipped Places */}
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

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              保存为约会计划
            </Button>
            <Button onClick={() => setOptimizedRoute(null)} variant="outline">
              重新规划
            </Button>
            <Button onClick={onCancel} variant="ghost">
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
