import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DiaryCard } from "@/components/DiaryCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar as CalendarIcon, Edit, Trash2, BookHeart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Diary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [relationship, setRelationship] = useState<any>(null);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [mode, setMode] = useState<'list' | 'edit' | 'view'>('list');
  const [currentDiary, setCurrentDiary] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("happy");
  const [isShared, setIsShared] = useState(false);
  const [diaryDate, setDiaryDate] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (id && diaries.length > 0) {
      const diary = diaries.find(d => d.id === id);
      if (diary) {
        viewDiary(diary);
      }
    }
  }, [id, diaries]);

  const loadData = async () => {
    try {
      const { data: rel, error: relError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (relError) throw relError;
      setRelationship(rel);

      if (rel) {
        const { data, error } = await supabase
          .from('couple_diaries')
          .select('*')
          .eq('relationship_id', rel.id)
          .order('diary_date', { ascending: false });

        if (error) throw error;
        setDiaries(data || []);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMood("happy");
    setIsShared(false);
    setDiaryDate(new Date());
    setCurrentDiary(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setMode('edit');
  };

  const viewDiary = (diary: any) => {
    setCurrentDiary(diary);
    setTitle(diary.title);
    setContent(diary.content);
    setMood(diary.mood || "happy");
    setIsShared(diary.is_shared);
    setDiaryDate(new Date(diary.diary_date));
    setMode('view');
  };

  const handleEdit = () => {
    setMode('edit');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    if (!relationship) {
      toast.error('请先设置恋爱日期');
      return;
    }

    try {
      const diaryData = {
        relationship_id: relationship.id,
        author_id: user?.id,
        title: title.trim(),
        content: content.trim(),
        mood,
        is_shared: isShared,
        diary_date: format(diaryDate, 'yyyy-MM-dd')
      };

      if (currentDiary) {
        const { error } = await supabase
          .from('couple_diaries')
          .update(diaryData)
          .eq('id', currentDiary.id);

        if (error) throw error;
        toast.success('日记更新成功！');
      } else {
        const { error } = await supabase
          .from('couple_diaries')
          .insert(diaryData);

        if (error) throw error;
        toast.success('日记保存成功！');
      }

      await loadData();
      setMode('list');
      resetForm();
    } catch (error: any) {
      console.error('Error saving diary:', error);
      toast.error('保存失败，请重试');
    }
  };

  const handleDelete = async () => {
    if (!currentDiary) return;

    try {
      const { error } = await supabase
        .from('couple_diaries')
        .delete()
        .eq('id', currentDiary.id);

      if (error) throw error;
      
      toast.success('日记已删除');
      await loadData();
      setMode('list');
      resetForm();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting diary:', error);
      toast.error('删除失败');
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

  if (!relationship) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>提示</CardTitle>
            <CardDescription>您还没有设置恋爱日期</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              请先设置您的恋爱日期，才能使用日记功能。
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              去设置
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              if (mode === 'list') {
                navigate('/');
              } else {
                setMode('list');
                resetForm();
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {mode === 'list' ? '返回' : '返回列表'}
          </Button>
          {mode === 'list' && (
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              写日记
            </Button>
          )}
        </div>

        {/* List Mode */}
        {mode === 'list' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <BookHeart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">情侣日记</h1>
              <p className="text-muted-foreground">记录我们的点点滴滴</p>
            </div>

            {diaries.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">还没有日记，开始写第一篇吧</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    写日记
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diaries.map((diary) => (
                  <DiaryCard
                    key={diary.id}
                    title={diary.title}
                    content={diary.content}
                    mood={diary.mood}
                    isShared={diary.is_shared}
                    diaryDate={diary.diary_date}
                    isOwn={diary.author_id === user?.id}
                    onClick={() => viewDiary(diary)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* View Mode */}
        {mode === 'view' && currentDiary && (
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{title}</CardTitle>
                  <CardDescription>
                    {format(diaryDate, 'yyyy年MM月dd日')} · {isShared ? '与伴侣共享' : '仅自己可见'}
                  </CardDescription>
                </div>
                {currentDiary.author_id === user?.id && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{content}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Mode */}
        {mode === 'edit' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>{currentDiary ? '编辑日记' : '写新日记'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  placeholder="给这篇日记起个标题..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">内容</Label>
                <Textarea
                  id="content"
                  placeholder="写下今天的故事..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/5000
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mood">心情</Label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger id="mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="happy">😊 开心</SelectItem>
                      <SelectItem value="sad">😢 难过</SelectItem>
                      <SelectItem value="excited">🤩 兴奋</SelectItem>
                      <SelectItem value="calm">😌 平静</SelectItem>
                      <SelectItem value="anxious">😰 焦虑</SelectItem>
                      <SelectItem value="loving">🥰 爱意满满</SelectItem>
                      <SelectItem value="thoughtful">🤔 深思</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !diaryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {diaryDate ? format(diaryDate, 'yyyy年MM月dd日') : "选择日期"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={diaryDate}
                        onSelect={(date) => date && setDiaryDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="shared"
                  checked={isShared}
                  onCheckedChange={setIsShared}
                />
                <Label htmlFor="shared" className="cursor-pointer">
                  与伴侣共享这篇日记
                </Label>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSave} className="flex-1">
                  {currentDiary ? '保存修改' : '保存日记'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode(currentDiary ? 'view' : 'list');
                    if (!currentDiary) resetForm();
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这篇日记吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Diary;
