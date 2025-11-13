import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, X, Download, Share2 } from "lucide-react";

interface Activity {
  id: string;
  location_name: string;
  location_address?: string;
  activity_time?: string;
  description?: string;
  weather_condition?: string;
  temperature?: string;
  recommended_dishes?: string;
  activity_photos?: string[];
  activity_notes?: string;
  activity_keywords?: string[];
  activity_rating?: number;
  activity_report_image_url?: string;
}

interface ActivityReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  onReportGenerated: () => void;
}

export const ActivityReportDialog = ({ 
  open, 
  onOpenChange, 
  activity,
  onReportGenerated 
}: ActivityReportDialogProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState(activity.activity_notes || "");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(activity.activity_keywords || []);
  const [rating, setRating] = useState(activity.activity_rating || 0);
  const [template, setTemplate] = useState<string>("romantic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState(activity.activity_report_image_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 5) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const photoUrls: string[] = [];
    
    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${activity.id}-${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('date-reports')
        .upload(fileName, photo);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('date-reports')
        .getPublicUrl(fileName);

      photoUrls.push(publicUrl);
    }

    return photoUrls;
  };

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      setIsUploading(true);

      // Upload photos first
      const photoUrls = await uploadPhotos();
      
      setIsUploading(false);

      // Generate report with AI
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-activity-report',
        {
          body: {
            activityDetails: {
              location_name: activity.location_name,
              location_address: activity.location_address,
              activity_time: activity.activity_time,
              description: activity.description,
              weather_condition: activity.weather_condition,
              temperature: activity.temperature,
              recommended_dishes: activity.recommended_dishes,
            },
            photos: photoUrls,
            notes,
            keywords,
            rating,
            template,
          }
        }
      );

      if (functionError) throw functionError;

      const generatedImageUrl = functionData.imageUrl;
      setReportImageUrl(generatedImageUrl);

      // Update activity with report data
      const { error: updateError } = await supabase
        .from('date_plan_activities')
        .update({
          activity_photos: photoUrls,
          activity_notes: notes,
          activity_keywords: keywords,
          activity_rating: rating,
          activity_report_image_url: generatedImageUrl,
          report_generated_at: new Date().toISOString(),
        })
        .eq('id', activity.id);

      if (updateError) throw updateError;

      toast({
        title: "报告生成成功！",
        description: "精美的活动报告已生成，可以分享到社交媒体了 🎉",
      });

      onReportGenerated();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "报告生成过程中出现错误",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  const downloadReport = () => {
    if (reportImageUrl) {
      const link = document.createElement('a');
      link.href = reportImageUrl;
      link.download = `activity-report-${activity.location_name}.png`;
      link.click();
    }
  };

  const shareReport = async () => {
    if (reportImageUrl && navigator.share) {
      try {
        const response = await fetch(reportImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'activity-report.png', { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: `${activity.location_name} - 活动报告`,
          text: '看看我们的约会活动！',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex gap-2 items-center">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{rating}/10</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {reportImageUrl ? "活动报告" : "为活动生成精美报告"} 🎨
          </DialogTitle>
        </DialogHeader>

        {!reportImageUrl ? (
          <div className="space-y-6">
            <div className="bg-secondary/20 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">{activity.location_name}</h3>
              {activity.activity_time && (
                <p className="text-sm text-muted-foreground">🕐 {activity.activity_time}</p>
              )}
              {activity.location_address && (
                <p className="text-sm text-muted-foreground">📍 {activity.location_address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">🎨 报告风格模板</Label>
              <Select value={template} onValueChange={setTemplate} disabled={isGenerating}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="选择报告风格" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="romantic">
                    <div className="flex items-center gap-2">
                      <span>💝</span>
                      <div>
                        <div className="font-medium">浪漫风格</div>
                        <div className="text-xs text-muted-foreground">粉色渐变、温馨浪漫、爱心装饰</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="minimalist">
                    <div className="flex items-center gap-2">
                      <span>⚪</span>
                      <div>
                        <div className="font-medium">简约风格</div>
                        <div className="text-xs text-muted-foreground">黑白灰、线条简洁、留白充足</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="cute">
                    <div className="flex items-center gap-2">
                      <span>🌸</span>
                      <div>
                        <div className="font-medium">可爱风格</div>
                        <div className="text-xs text-muted-foreground">明亮色彩、卡通元素、俏皮活泼</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="vintage">
                    <div className="flex items-center gap-2">
                      <span>📷</span>
                      <div>
                        <div className="font-medium">复古风格</div>
                        <div className="text-xs text-muted-foreground">棕黄色调、胶片质感、怀旧氛围</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="elegant">
                    <div className="flex items-center gap-2">
                      <span>✨</span>
                      <div>
                        <div className="font-medium">优雅风格</div>
                        <div className="text-xs text-muted-foreground">金色点缀、奢华精致、高级感</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="fresh">
                    <div className="flex items-center gap-2">
                      <span>🌿</span>
                      <div>
                        <div className="font-medium">清新风格</div>
                        <div className="text-xs text-muted-foreground">绿色自然、清爽舒适、简单治愈</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photos">📸 上传活动照片</Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isGenerating}
              />
              {photos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  已选择 {photos.length} 张照片
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">✍️ 活动描述</Label>
              <Textarea
                id="notes"
                placeholder="分享这次活动的感受和美好回忆..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">🏷️ 关键词（用于AI扩充内容）</Label>
              <div className="flex gap-2">
                <Input
                  id="keywords"
                  placeholder="输入关键词，如：浪漫、惊喜、美食"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  disabled={isGenerating || keywords.length >= 5}
                />
                <Button 
                  type="button" 
                  onClick={addKeyword}
                  disabled={isGenerating || keywords.length >= 5 || !keywordInput.trim()}
                >
                  添加
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <div
                      key={keyword}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        disabled={isGenerating}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                最多添加5个关键词（已添加 {keywords.length}/5）
              </p>
            </div>

            <div className="space-y-2">
              <Label>⭐ 活动评分</Label>
              {renderStarRating()}
            </div>

            <Button
              onClick={generateReport}
              disabled={isGenerating || rating === 0}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "上传照片中..." : "AI生成中..."}
                </>
              ) : (
                "生成精美报告"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={reportImageUrl}
                alt="Activity Report"
                className="w-full rounded-lg shadow-lg"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadReport} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                下载报告
              </Button>
              {navigator.share && (
                <Button onClick={shareReport} variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  分享
                </Button>
              )}
            </div>

            <Button
              onClick={() => {
                setReportImageUrl("");
                setPhotos([]);
                setNotes("");
                setKeywords([]);
                setRating(0);
              }}
              variant="outline"
              className="w-full"
            >
              重新生成报告
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
