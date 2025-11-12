import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnniversaryCardProps {
  title: string;
  date: Date;
  daysUntil: number;
  isPast?: boolean;
  icon?: React.ReactNode;
}

export const AnniversaryCard = ({ 
  title, 
  date, 
  daysUntil, 
  isPast = false,
  icon 
}: AnniversaryCardProps) => {
  const isToday = daysUntil === 0;
  const isUpcoming = daysUntil > 0 && daysUntil <= 7;

  return (
    <Card 
      className={cn(
        "p-6 transition-all duration-300 hover:scale-105 hover:shadow-card",
        "bg-card/80 backdrop-blur-sm border-border/50",
        isToday && "ring-2 ring-primary shadow-card animate-float",
        isUpcoming && "ring-1 ring-secondary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon || <Heart className="w-5 h-5 text-primary" />}
            <h3 className="font-semibold text-lg text-card-foreground">
              {title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {date.toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {!isPast && (
            <div className={cn(
              "inline-block px-4 py-2 rounded-full text-sm font-medium",
              isToday && "bg-gradient-primary text-white",
              isUpcoming && "bg-secondary/20 text-secondary-foreground",
              !isToday && !isUpcoming && "bg-muted text-muted-foreground"
            )}>
              {isToday ? '🎉 就是今天！' : `还有 ${daysUntil} 天`}
            </div>
          )}
          {isPast && (
            <div className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-muted/50 text-muted-foreground">
              已度过
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
