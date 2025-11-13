import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, X, Upload } from "lucide-react";

interface Activity {
  id: string;
  location_name: string;
  activity_photos?: string[];
  activity_notes?: string;
  activity_rating?: number;
}

interface ActivityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  onSaved: () => void;
}

export const ActivityDetailsDialog = ({ 
  open, 
  onOpenChange, 
  activity,
  onSaved 
}: ActivityDetailsDialogProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(activity.activity_photos || []);
  const [notes, setNotes] = useState(activity.activity_notes || "");
  const [rating, setRating] = useState(activity.activity_rating || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setExistingPhotos(activity.activity_photos || []);
    setNotes(activity.activity_notes || "");
    setRating(activity.activity_rating || 0);
    setPhotos([]);
  }, [activity, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos([...photos, ...newFiles]);
    }
  };

  const removeNewPhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (url: string) => {
    setExistingPhotos(existingPhotos.filter(p => p !== url));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const photoUrls: string[] = [];
    
    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${activity.id}-${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
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

  const saveDetails = async () => {
    try {
      setIsSaving(true);
      setIsUploading(true);

      // Upload new photos
      const newPhotoUrls = await uploadPhotos();
      setIsUploading(false);

      // Combine existing and new photos
      const allPhotoUrls = [...existingPhotos, ...newPhotoUrls];

      // Update activity in database
      // @ts-ignore - Type will be fixed when types.ts regenerates
      const { error } = await supabase
        .from('date_plan_activities')
        .update({
          activity_photos: allPhotoUrls,
          activity_notes: notes,
          activity_rating: rating,
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: "保存成功",
        description: "活动详情已更新",
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving activity details:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存活动详情时出错",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑活动详情 - {activity.location_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>上传照片</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={isSaving}
              >
                <Upload className="w-4 h-4 mr-2" />
                选择照片
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">已上传的照片</Label>
                <div className="grid grid-cols-3 gap-2">
                  {existingPhotos.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`照片 ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => removeExistingPhoto(url)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Photos Preview */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">新选择的照片</Label>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`新照片 ${index + 1}`} 
                        className="w-full h-24 object-cover rounded" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => removeNewPhoto(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>活动笔记</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录这次活动的感受、趣事..."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>活动评分</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  disabled={isSaving}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={saveDetails}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploading ? "上传照片中..." : "保存中..."}
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
