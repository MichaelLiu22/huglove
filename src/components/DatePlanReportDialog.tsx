import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Share2 } from "lucide-react";

interface DatePlanReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planDate: string;
  onReportGenerated: () => void;
}

export const DatePlanReportDialog = ({ 
  open, 
  onOpenChange, 
  planId,
  planDate,
  onReportGenerated 
}: DatePlanReportDialogProps) => {
  const [template, setTemplate] = useState<string>("romantic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const { toast } = useToast();

  const generateReport = async () => {
    try {
      setIsGenerating(true);

      // Call edge function to generate report
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-date-report',
        {
          body: {
            planId,
            template,
          }
        }
      );

      if (functionError) throw functionError;

      if (functionData?.reportImageUrl) {
        setReportImageUrl(functionData.reportImageUrl);
        toast({
          title: "报告生成成功",
          description: "您的约会日报告已生成",
        });
        onReportGenerated();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成报告时出错",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (reportImageUrl) {
      const link = document.createElement('a');
      link.href = reportImageUrl;
      link.download = `约会报告-${planDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareReport = async () => {
    if (reportImageUrl && navigator.share) {
      try {
        const response = await fetch(reportImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `约会报告-${planDate}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: '约会报告',
          text: '看看我们的约会报告！',
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "分享失败",
          description: "无法分享报告",
          variant: "destructive",
        });
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(reportImageUrl);
      toast({
        title: "链接已复制",
        description: "报告链接已复制到剪贴板",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>生成约会日报告 - {planDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!reportImageUrl ? (
            <>
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>选择报告模板</Label>
                <Select value={template} onValueChange={setTemplate} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="romantic">浪漫温馨</SelectItem>
                    <SelectItem value="minimalist">简约清新</SelectItem>
                    <SelectItem value="vintage">复古怀旧</SelectItem>
                    <SelectItem value="modern">现代时尚</SelectItem>
                    <SelectItem value="artistic">艺术创意</SelectItem>
                    <SelectItem value="polaroid">拍立得风格</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "生成精美报告"
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Generated Report */}
              <div className="space-y-4">
                <img
                  src={reportImageUrl}
                  alt="约会报告"
                  className="w-full rounded-lg shadow-lg"
                />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={downloadReport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载报告
                  </Button>
                  <Button
                    onClick={shareReport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    分享报告
                  </Button>
                </div>

                {/* Regenerate Button */}
                <Button
                  onClick={() => {
                    setReportImageUrl("");
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  重新生成
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
