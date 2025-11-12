import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PhotoCardProps {
  id: string;
  photoUrl: string;
  caption?: string;
  photoDate: Date;
  isOwner: boolean;
  onDelete: (id: string) => void;
}

export const PhotoCard = ({
  id,
  photoUrl,
  caption,
  photoDate,
  isOwner,
  onDelete,
}: PhotoCardProps) => {
  return (
    <Card className="overflow-hidden group relative">
      <div className="aspect-square relative">
        <img
          src={photoUrl}
          alt={caption || "照片"}
          className="w-full h-full object-cover"
        />
        {isOwner && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {(caption || photoDate) && (
        <div className="p-3">
          {caption && (
            <p className="text-sm text-foreground mb-1">{caption}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {format(photoDate, "PPP", { locale: zhCN })}
          </p>
        </div>
      )}
    </Card>
  );
};
