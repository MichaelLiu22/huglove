import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, Globe } from "lucide-react";

interface DiaryCardProps {
  title: string;
  content: string;
  mood?: string;
  isShared: boolean;
  diaryDate: string;
  isOwn: boolean;
  onClick: () => void;
}

const moodEmojis: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  excited: "🤩",
  calm: "😌",
  anxious: "😰",
  loving: "🥰",
  thoughtful: "🤔"
};

const moodLabels: Record<string, string> = {
  happy: "开心",
  sad: "难过",
  excited: "兴奋",
  calm: "平静",
  anxious: "焦虑",
  loving: "爱意满满",
  thoughtful: "深思"
};

export const DiaryCard = ({
  title,
  content,
  mood,
  isShared,
  diaryDate,
  isOwn,
  onClick
}: DiaryCardProps) => {
  return (
    <Card
      className="shadow-soft hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            {mood && (
              <span className="text-2xl" title={moodLabels[mood]}>
                {moodEmojis[mood]}
              </span>
            )}
            <div title={isShared ? "与伴侣共享" : "仅自己可见"}>
              {isShared ? (
                <Globe className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {new Date(diaryDate).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          {!isOwn && (
            <Badge variant="secondary" className="text-xs">
              <Heart className="w-3 h-3 mr-1" fill="currentColor" />
              TA的日记
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">{content}</p>
      </CardContent>
    </Card>
  );
};
