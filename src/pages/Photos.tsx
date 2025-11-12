import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCard } from "@/components/PhotoCard";
import { Upload, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  photo_date: string;
  uploader_id: string;
}

const Photos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadRelationshipAndPhotos();
  }, [user, navigate]);

  const loadRelationshipAndPhotos = async () => {
    try {
      // Get relationship
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (relError && relError.code !== 'PGRST116') throw relError;
      
      if (!relationship) {
        setLoading(false);
        return;
      }

      setRelationshipId(relationship.id);

      // Load photos
      const { data: photosData, error: photosError } = await supabase
        .from('couple_photos')
        .select('*')
        .eq('relationship_id', relationship.id)
        .order('photo_date', { ascending: false });

      if (photosError) throw photosError;

      setPhotos(photosData || []);
    } catch (error: any) {
      console.error('Error loading photos:', error);
      toast.error('加载照片失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (5MB limit)
      if (file.size > 5242880) {
        toast.error('图片大小不能超过5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !relationshipId) {
      toast.error('请选择图片');
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('couple-photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('couple-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('couple_photos')
        .insert({
          relationship_id: relationshipId,
          uploader_id: user?.id,
          photo_url: publicUrl,
          caption: caption || null,
          photo_date: photoDate,
        });

      if (dbError) throw dbError;

      toast.success('照片上传成功！');
      setIsDialogOpen(false);
      setSelectedFile(null);
      setCaption("");
      setPhotoDate(new Date().toISOString().split('T')[0]);
      loadRelationshipAndPhotos();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('确定要删除这张照片吗？')) return;

    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      // Delete from storage
      const fileName = photo.photo_url.split('/').slice(-2).join('/');
      const { error: storageError } = await supabase.storage
        .from('couple-photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('couple_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success('照片已删除');
      loadRelationshipAndPhotos();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!relationshipId) {
    return (
      <div className="min-h-screen bg-gradient-soft p-6">
        <div className="max-w-2xl mx-auto text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">还没有设置恋爱信息</h2>
          <p className="text-muted-foreground mb-6">请先在主页设置你们的恋爱纪念日</p>
          <Button onClick={() => navigate('/')}>返回主页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6 shadow-soft">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">照片墙</h1>
                <p className="text-white/80 text-sm">记录美好瞬间</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Upload className="w-4 h-4 mr-2" />
                  上传照片
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>上传新照片</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo">选择照片 (最大5MB)</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caption">描述</Label>
                    <Textarea
                      id="caption"
                      placeholder="添加一些描述..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">拍摄日期</Label>
                    <Input
                      id="date"
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="w-full"
                  >
                    {uploading ? "上传中..." : "上传"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="max-w-6xl mx-auto p-6">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">还没有照片</h3>
            <p className="text-muted-foreground mb-6">开始上传你们的美好回忆吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                id={photo.id}
                photoUrl={photo.photo_url}
                caption={photo.caption || undefined}
                photoDate={new Date(photo.photo_date)}
                isOwner={photo.uploader_id === user?.id}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Photos;
