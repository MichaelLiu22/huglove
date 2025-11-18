import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin, Clock, Archive, Trash2, Edit, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WishlistItem {
  id: string;
  location_name: string;
  location_address: string | null;
  location_type: string | null;
  description: string | null;
  priority: string;
  estimated_duration: number;
  open_time: string | null;
  close_time: string | null;
  tags: string[] | null;
  visit_count: number;
  last_visited_date: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

const activityTypes = [
  "餐厅", "咖啡厅", "电影院", "公园", "博物馆", "购物中心",
  "景点", "户外活动", "娱乐场所", "艺术馆", "其他"
];

const tagOptions = ["浪漫", "美食", "户外", "休闲", "文化", "运动", "购物", "冒险"];

export default function Wishlist() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: relationship } = useQuery({
    queryKey: ["relationship"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      const { data, error } = await supabase
        .from("relationships")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", relationship?.id],
    queryFn: async () => {
      if (!relationship?.id) return [];

      const { data, error } = await supabase
        .from("date_wishlist")
        .select("*")
        .eq("relationship_id", relationship.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!relationship?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (item: Partial<WishlistItem>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !relationship?.id) throw new Error("未登录或未关联");

      const { error } = await supabase.from("date_wishlist").insert([{
        location_name: item.location_name || "",
        location_address: item.location_address,
        location_type: item.location_type,
        description: item.description,
        priority: item.priority || "chill",
        estimated_duration: item.estimated_duration || 60,
        open_time: item.open_time,
        close_time: item.close_time,
        tags: item.tags,
        notes: item.notes,
        relationship_id: relationship.id,
        added_by: user.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("已添加到愿望清单");
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("添加失败：" + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WishlistItem> }) => {
      const { error } = await supabase
        .from("date_wishlist")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("更新成功");
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error("更新失败：" + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("date_wishlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("已删除");
    },
  });

  const activeItems = wishlistItems.filter(item => !item.is_archived);
  const archivedItems = wishlistItems.filter(item => item.is_archived);

  const filteredActiveItems = filterTag
    ? activeItems.filter(item => item.tags?.includes(filterTag))
    : activeItems;

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">约会愿望清单</h1>
          <p className="text-muted-foreground mt-1">收集你想去的地方，让约会更有计划</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              添加地点
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <WishlistForm
              onSubmit={(data) => addMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterTag === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTag(null)}
        >
          全部
        </Button>
        {tagOptions.map(tag => (
          <Button
            key={tag}
            variant={filterTag === tag ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTag(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            想去的地方 ({filteredActiveItems.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            已完成 ({archivedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : filteredActiveItems.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>还没有添加想去的地方</p>
                <p className="text-sm mt-2">点击上方"添加地点"开始收集你的约会灵感</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActiveItems.map(item => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onArchive={() => updateMutation.mutate({ id: item.id, updates: { is_archived: true } })}
                  onDelete={() => deleteMutation.mutate(item.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedItems.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>还没有已完成的地点</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedItems.map(item => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onArchive={() => updateMutation.mutate({ id: item.id, updates: { is_archived: false } })}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  isArchived
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <WishlistForm
              initialData={editingItem}
              onSubmit={(data) => updateMutation.mutate({ id: editingItem.id, updates: data })}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function WishlistCard({
  item,
  onEdit,
  onArchive,
  onDelete,
  isArchived = false,
}: {
  item: WishlistItem;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
}) {
  return (
    <Card className={isArchived ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.location_name}</CardTitle>
            {item.location_type && (
              <Badge variant="secondary" className="mt-2">
                {item.location_type}
              </Badge>
            )}
          </div>
          <Badge variant={item.priority === "must_go" ? "default" : "outline"}>
            {item.priority === "must_go" ? "必去" : "休闲"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.location_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{item.location_address}</span>
          </div>
        )}

        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}

        {(item.open_time || item.close_time) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {item.open_time || "?"} - {item.close_time || "?"}
            </span>
          </div>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {item.visit_count > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4" />
            <span>已去过 {item.visit_count} 次</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Edit className="w-3 h-3 mr-1" />
            编辑
          </Button>
          <Button variant="outline" size="sm" onClick={onArchive}>
            {isArchived ? "恢复" : <Archive className="w-3 h-3" />}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WishlistForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: WishlistItem;
  onSubmit: (data: Partial<WishlistItem>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    location_name: initialData?.location_name || "",
    location_address: initialData?.location_address || "",
    location_type: initialData?.location_type || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "chill",
    estimated_duration: initialData?.estimated_duration || 60,
    open_time: initialData?.open_time || "",
    close_time: initialData?.close_time || "",
    tags: initialData?.tags || [],
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{initialData ? "编辑地点" : "添加新地点"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="location_name">地点名称 *</Label>
          <Input
            id="location_name"
            value={formData.location_name}
            onChange={e => setFormData({ ...formData, location_name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="location_address">地址</Label>
          <Input
            id="location_address"
            value={formData.location_address}
            onChange={e => setFormData({ ...formData, location_address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location_type">类型</Label>
            <Select
              value={formData.location_type}
              onValueChange={value => setFormData({ ...formData, location_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">优先级</Label>
            <Select
              value={formData.priority}
              onValueChange={value => setFormData({ ...formData, priority: value })}
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
          <Label>标签</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {tagOptions.map(tag => (
              <Badge
                key={tag}
                variant={formData.tags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="estimated_duration">预计时长（分钟）</Label>
            <Input
              id="estimated_duration"
              type="number"
              value={formData.estimated_duration}
              onChange={e => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 60 })}
            />
          </div>
          <div>
            <Label htmlFor="open_time">营业开始</Label>
            <Input
              id="open_time"
              type="time"
              value={formData.open_time}
              onChange={e => setFormData({ ...formData, open_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="close_time">营业结束</Label>
            <Input
              id="close_time"
              type="time"
              value={formData.close_time}
              onChange={e => setFormData({ ...formData, close_time: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">备注</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          {initialData ? "保存" : "添加"}
        </Button>
      </div>
    </form>
  );
}