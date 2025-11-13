import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Download, Share2 } from "lucide-react";

interface Activity {
  time?: string;
  location_name: string;
  location_address?: string;
  description?: string;
}

interface DateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  relationshipId: string;
  planDate: string;
  planNotes?: string;
  activities: Activity[];
}

export const DateReportDialog = ({
  open,
  onOpenChange,
  planId,
  relationshipId,
  planDate,
  planNotes,
  activities,
}: DateReportDialogProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newFiles]);
    }
  };

  const uploadPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("未登录");

    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const fileExt = photo.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("date-reports")
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("date-reports")
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      setUploading(true);
      const photoUrls = photos.length > 0 ? await uploadPhotos() : [];
      setUploading(false);

      const { data, error } = await supabase.functions.invoke("generate-date-report", {
        body: {
          planDetails: {
            date: planDate,
            notes: planNotes,
          },
          activities: activities.map(act => ({
            time: act.time,
            name: act.location_name,
            location: act.location_address || act.location_name,
            description: act.description,
          })),
          notes,
          photoCount: photos.length,
        },
      });

      if (error) throw error;

      // 将 base64 图片上传到 storage
      const base64Data = data.imageUrl.split(",")[1];
      const blob = await fetch(data.imageUrl).then(r => r.blob());
      
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user!.id}/report-${planId}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("date-reports")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("date-reports")
        .getPublicUrl(fileName);

      setReportImageUrl(urlData.publicUrl);

      // 保存到数据库
      const { error: dbError } = await supabase
        .from("date_reports")
        .insert({
          plan_id: planId,
          relationship_id: relationshipId,
          report_image_url: urlData.publicUrl,
          photos: photoUrls,
          notes,
        });

      if (dbError) throw dbError;

      toast.success("约会报告生成成功！");
    } catch (error: any) {
      console.error("生成报告失败:", error);
      toast.error(error.message || "生成报告失败");
    } finally {
      setGenerating(false);
      setUploading(false);
    }
  };

  const downloadReport = () => {
    if (!reportImageUrl) return;
    
    const link = document.createElement("a");
    link.href = reportImageUrl;
    link.download = `date-report-${planDate}.png`;
    link.click();
  };

  const shareReport = async () => {
    if (!reportImageUrl) return;

    if (navigator.share) {
      try {
        const response = await fetch(reportImageUrl);
        const blob = await response.blob();
        const file = new File([blob], "date-report.png", { type: "image/png" });

        await navigator.share({
          files: [file],
          title: "我们的约会报告",
          text: "看看我们的约会！",
        });
      } catch (error) {
        console.error("分享失败:", error);
        toast.error("分享失败，请尝试下载后手动分享");
      }
    } else {
      toast.error("您的浏览器不支持分享功能");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">生成约会报告 📸</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!reportImageUrl ? (
            <>
              <div>
                <Label htmlFor="photos" className="text-base mb-2 block">
                  上传约会照片（可选）
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="photos"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      点击上传照片
                    </span>
                  </label>
                  {photos.length > 0 && (
                    <div className="mt-4 text-sm text-foreground">
                      已选择 {photos.length} 张照片
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-base mb-2 block">
                  约会感想（可选）
                </Label>
                <Textarea
                  id="notes"
                  placeholder="写下你们对这次约会的感想和回忆..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={generateReport}
                disabled={generating || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传照片中...
                  </>
                ) : generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成报告中...
                  </>
                ) : (
                  "✨ 生成精美报告"
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={reportImageUrl}
                  alt="约会报告"
                  className="w-full h-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载报告
                </Button>
                <Button
                  onClick={shareReport}
                  className="w-full"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  分享报告
                </Button>
              </div>

              <Button
                onClick={() => {
                  setReportImageUrl(null);
                  setPhotos([]);
                  setNotes("");
                }}
                variant="ghost"
                className="w-full"
              >
                重新生成
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
