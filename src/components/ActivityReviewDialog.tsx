import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, Star, Plus, Trash2 } from "lucide-react";

interface ExpenseItem {
  description: string;
  amount: number;
  category: string;
  paid_by: string;
}

interface Activity {
  id: string;
  activity_time: string;
  location_name: string;
  location_type: string;
  description: string;
  activity_notes?: string;
  activity_photos?: string[];
  activity_rating?: number;
  expenses?: ExpenseItem[];
}

interface ActivityReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  onReviewComplete: () => void;
  userId: string;
  partnerId?: string;
}

const EXPENSE_CATEGORIES = [
  "餐饮", "交通", "娱乐", "购物", "住宿", "门票", "其他"
];

export const ActivityReviewDialog = ({ open, onOpenChange, activities, onReviewComplete, userId, partnerId }: ActivityReviewDialogProps) => {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [reviewData, setReviewData] = useState<Record<string, { notes: string; photos: string[]; rating: number; expenses: ExpenseItem[] }>>(
    activities.reduce((acc, activity) => ({
      ...acc,
      [activity.id]: {
        notes: activity.activity_notes || "",
        photos: activity.activity_photos || [],
        rating: activity.activity_rating || 0,
        expenses: activity.expenses || []
      }
    }), {})
  );
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentActivity = activities[currentActivityIndex];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentActivity.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError, data } = await supabase.storage
          .from('diary-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('diary-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setReviewData(prev => ({
        ...prev,
        [currentActivity.id]: {
          ...prev[currentActivity.id],
          photos: [...prev[currentActivity.id].photos, ...uploadedUrls]
        }
      }));

      toast.success(`成功上传 ${uploadedUrls.length} 张照片`);
    } catch (error: any) {
      toast.error('上传照片失败：' + error.message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (photoUrl: string) => {
    setReviewData(prev => ({
      ...prev,
      [currentActivity.id]: {
        ...prev[currentActivity.id],
        photos: prev[currentActivity.id].photos.filter(url => url !== photoUrl)
      }
    }));
  };

  const handleNext = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(currentActivityIndex - 1);
    }
  };

  const handleAddExpense = () => {
    setReviewData(prev => ({
      ...prev,
      [currentActivity.id]: {
        ...prev[currentActivity.id],
        expenses: [
          ...prev[currentActivity.id].expenses,
          { description: "", amount: 0, category: "餐饮", paid_by: userId }
        ]
      }
    }));
  };

  const handleRemoveExpense = (index: number) => {
    setReviewData(prev => ({
      ...prev,
      [currentActivity.id]: {
        ...prev[currentActivity.id],
        expenses: prev[currentActivity.id].expenses.filter((_, i) => i !== index)
      }
    }));
  };

  const handleExpenseChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setReviewData(prev => ({
      ...prev,
      [currentActivity.id]: {
        ...prev[currentActivity.id],
        expenses: prev[currentActivity.id].expenses.map((exp, i) => 
          i === index ? { ...exp, [field]: value } : exp
        )
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 更新所有活动的复盘数据
      for (const activity of activities) {
        const review = reviewData[activity.id];
        const { error } = await supabase
          .from('date_plan_activities')
          .update({
            activity_notes: review.notes,
            activity_photos: review.photos,
            activity_rating: review.rating,
            expenses: review.expenses as any
          })
          .eq('id', activity.id);

        if (error) throw error;
      }

      toast.success('复盘保存成功！');
      onReviewComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('保存失败：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentActivity) return null;

  const currentReview = reviewData[currentActivity.id];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>约会复盘 ({currentActivityIndex + 1}/{activities.length})</DialogTitle>
          <DialogDescription>
            分享你对这次活动的感受和体验
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 活动信息 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">活动时间：</span>
              <span className="text-sm">{currentActivity.activity_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">地点：</span>
              <span className="text-sm">{currentActivity.location_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">类型：</span>
              <span className="text-sm">{currentActivity.location_type}</span>
            </div>
            {currentActivity.description && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium">描述：</span>
                <span className="text-sm">{currentActivity.description}</span>
              </div>
            )}
          </div>

          {/* 评分 */}
          <div className="space-y-2">
            <Label>活动评分</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewData(prev => ({
                    ...prev,
                    [currentActivity.id]: { ...prev[currentActivity.id], rating: star }
                  }))}
                  className="transition-all hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= currentReview.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 感想输入 */}
          <div className="space-y-2">
            <Label htmlFor="notes">活动感想</Label>
            <Textarea
              id="notes"
              placeholder="分享你的感受、印象深刻的瞬间、有趣的对话..."
              value={currentReview.notes}
              onChange={(e) => setReviewData(prev => ({
                ...prev,
                [currentActivity.id]: { ...prev[currentActivity.id], notes: e.target.value }
              }))}
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              这些感想会成为生成日记的主要参考
            </p>
          </div>

          {/* 照片上传 */}
          <div className="space-y-2">
            <Label>活动照片</Label>
            <div className="space-y-4">
              {/* 照片预览网格 */}
              {currentReview.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {currentReview.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`活动照片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 上传按钮 */}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhotos}
                  className="hidden"
                  id="photo-upload"
                />
                <Label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploadingPhotos}
                    asChild
                  >
                    <div>
                      {uploadingPhotos ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          上传照片
                        </>
                      )}
                    </div>
                  </Button>
                </Label>
              </div>
            </div>
          </div>

          {/* 费用记录 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>费用记录</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExpense}
              >
                <Plus className="h-4 w-4 mr-1" />
                添加费用
              </Button>
            </div>
            
            {currentReview.expenses.length > 0 ? (
              <div className="space-y-3">
                {currentReview.expenses.map((expense, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">费用项 {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExpense(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">项目名称</Label>
                        <Input
                          value={expense.description}
                          onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                          placeholder="例如：主菜、门票"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">金额（元）</Label>
                        <Input
                          type="number"
                          value={expense.amount || ''}
                          onChange={(e) => handleExpenseChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">类别</Label>
                        <Select
                          value={expense.category}
                          onValueChange={(value) => handleExpenseChange(index, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">支付方</Label>
                        <Select
                          value={expense.paid_by}
                          onValueChange={(value) => handleExpenseChange(index, 'paid_by', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={userId}>我</SelectItem>
                            {partnerId && <SelectItem value={partnerId}>对方</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无费用记录，点击上方按钮添加
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentActivityIndex === 0}
              className="flex-1"
            >
              上一个
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNext}
              disabled={currentActivityIndex === activities.length - 1}
              className="flex-1"
            >
              下一个
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存复盘'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
