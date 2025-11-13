import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const { toast } = useToast();

  // Load existing report when dialog opens
  useEffect(() => {
    if (open && planId) {
      loadExistingReport();
    }
  }, [open, planId]);

  const loadExistingReport = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('date_reports' as any)
        .select('report_image_url')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No existing report, that's ok
        console.log('No existing report found');
        setReportImageUrl("");
        return;
      }

      if (data?.report_image_url) {
        setReportImageUrl(data.report_image_url);
      }
    } catch (error) {
      console.log('Error loading report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setIsGenerating(true);

      // Call edge function to generate report
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-date-report',
        {
          body: {
            planId,
          }
        }
      );

      if (functionError) throw functionError;

      if (functionData?.reportImageUrl) {
        setReportImageUrl(functionData.reportImageUrl);
        toast({
          title: "报告生成成功",
          description: "您的约会日记已生成",
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
      link.download = `约会日记-${planDate}.png`;
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
        const file = new File([blob], `约会日记-${planDate}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: '约会日记',
          text: '看看我们的约会日记！',
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "分享失败",
          description: "无法分享日记",
          variant: "destructive",
        });
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(reportImageUrl);
      toast({
        title: "链接已复制",
        description: "日记链接已复制到剪贴板",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>生成约会日记 - {planDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">加载中...</p>
            </div>
          ) : !reportImageUrl ? (
            <>
              {/* Description */}
              <div className="text-center space-y-2 py-8">
                <p className="text-muted-foreground">
                  AI将根据您的活动照片和笔记，生成一张精美的约会日记图片
                </p>
                <p className="text-sm text-muted-foreground">
                  包含活动时间线、地点信息，以及根据您的笔记扩展的温馨文字
                </p>
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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AI生成中...
                  </>
                ) : (
                  <>📖 生成约会日记</>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Display Generated Report */}
              <div className="space-y-4">
                <img 
                  src={reportImageUrl} 
                  alt="约会日记"
                  className="w-full rounded-lg shadow-lg"
                />
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={downloadReport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载
                  </Button>
                  
                  <Button 
                    onClick={shareReport}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    分享
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setReportImageUrl("");
                      generateReport();
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    🔄 重新生成
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}