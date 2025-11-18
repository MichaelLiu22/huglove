import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WishlistItem {
  id: string;
  location_name: string;
  location_address: string | null;
  location_type: string | null;
  priority: string;
  estimated_duration: number;
  open_time: string | null;
  close_time: string | null;
  tags: string[] | null;
  latitude: number | null;
  longitude: number | null;
}

interface WishlistPickerProps {
  relationshipId: string;
  selectedItems: string[];
  onToggleItem: (itemId: string, item: WishlistItem) => void;
  onAddAll: (items: WishlistItem[]) => void;
}

export function WishlistPicker({ relationshipId, selectedItems, onToggleItem, onAddAll }: WishlistPickerProps) {
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("date_wishlist")
        .select("*")
        .eq("relationship_id", relationshipId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!relationshipId,
  });

  const allTags = Array.from(new Set(wishlistItems.flatMap(item => item.tags || [])));

  const filteredItems = filterTag
    ? wishlistItems.filter(item => item.tags?.includes(filterTag))
    : wishlistItems;

  const selectedCount = filteredItems.filter(item => selectedItems.includes(item.id)).length;

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">加载愿望清单...</div>;
  }

  if (wishlistItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>愿望清单是空的</p>
          <p className="text-sm mt-1">先去添加一些想去的地方吧</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterTag === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTag(null)}
          >
            全部 ({wishlistItems.length})
          </Button>
          {allTags.map(tag => (
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
        {filteredItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddAll(filteredItems)}
            disabled={selectedCount === filteredItems.length}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            全选 ({selectedCount}/{filteredItems.length})
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredItems.map(item => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all ${
                selectedItems.includes(item.id) ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => onToggleItem(item.id, item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => onToggleItem(item.id, item)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.location_name}</h4>
                        {item.location_type && (
                          <Badge variant="secondary" className="mt-1">
                            {item.location_type}
                          </Badge>
                        )}
                      </div>
                      <Badge variant={item.priority === "must_go" ? "default" : "outline"}>
                        {item.priority === "must_go" ? "必去" : "休闲"}
                      </Badge>
                    </div>

                    {item.location_address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{item.location_address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.estimated_duration}分钟</span>
                      </div>
                      {(item.open_time || item.close_time) && (
                        <span>
                          {item.open_time || "?"} - {item.close_time || "?"}
                        </span>
                      )}
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}