import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Star, Heart, MessageCircle, Ear, Smile } from "lucide-react";

const DailyRating = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [relationship, setRelationship] = useState<any>(null);
  const [hasRatedToday, setHasRatedToday] = useState(false);
  
  const [communicationScore, setCommunicationScore] = useState([7]);
  const [empathyScore, setEmpathyScore] = useState([7]);
  const [listeningScore, setListeningScore] = useState([7]);
  const [overallFeeling, setOverallFeeling] = useState([7]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: rel, error: relError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (relError) throw relError;
      setRelationship(rel);

      if (!rel?.partner_id) {
        toast.error('请先关联伴侣');
        return;
      }

      // 检查今天是否已评分
      const today = new Date().toISOString().split('T')[0];
      const { data: rating, error: ratingError } = await supabase
        .from('daily_ratings')
        .select('*')
        .eq('rater_id', user?.id)
        .eq('rating_date', today)
        .maybeSingle();

      if (ratingError && ratingError.code !== 'PGRST116') throw ratingError;
      
      if (rating) {
        setHasRatedToday(true);
        setCommunicationScore([rating.communication_score || 7]);
        setEmpathyScore([rating.empathy_score || 7]);
        setListeningScore([rating.listening_score || 7]);
        setOverallFeeling([rating.overall_feeling || 7]);
        setNotes(rating.notes || '');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!relationship?.partner_id) {
      toast.error('请先关联伴侣');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_ratings')
        .upsert({
          rater_id: user?.id,
          rated_id: relationship.partner_id,
          relationship_id: relationship.id,
          rating_date: today,
          communication_score: communicationScore[0],
          empathy_score: empathyScore[0],
          listening_score: listeningScore[0],
          overall_feeling: overallFeeling[0],
          notes: notes.trim() || null
        });

      if (error) throw error;
      
      toast.success('评分提交成功！');
      setHasRatedToday(true);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
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

  if (!relationship?.partner_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>提示</CardTitle>
            <CardDescription>您还没有关联伴侣</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              请先在伴侣关联页面关联您的伴侣，才能使用评分功能。
            </p>
            <Button onClick={() => navigate('/partner')} className="w-full">
              去关联伴侣
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button variant="outline" onClick={() => navigate('/rating/history')}>
            查看历史
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">今日评分</h1>
          <p className="text-muted-foreground">基于非暴力沟通原则，记录今天的感受</p>
        </div>

        {hasRatedToday && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-center text-sm">
                ✨ 您今天已经提交过评分了，可以修改后重新提交
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              沟通质量
            </CardTitle>
            <CardDescription>
              今天的沟通是否顺畅、清晰、开放？
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>不太好</span>
                <span className="font-semibold text-lg text-foreground">{communicationScore[0]}/10</span>
                <span>非常好</span>
              </div>
              <Slider
                value={communicationScore}
                onValueChange={setCommunicationScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              共情能力
            </CardTitle>
            <CardDescription>
              TA能否理解和感受你的情绪与需求？
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>较弱</span>
                <span className="font-semibold text-lg text-foreground">{empathyScore[0]}/10</span>
                <span>很强</span>
              </div>
              <Slider
                value={empathyScore}
                onValueChange={setEmpathyScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ear className="w-5 h-5 text-primary" />
              倾听程度
            </CardTitle>
            <CardDescription>
              TA是否认真倾听，没有打断或评判？
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>不够</span>
                <span className="font-semibold text-lg text-foreground">{listeningScore[0]}/10</span>
                <span>很好</span>
              </div>
              <Slider
                value={listeningScore}
                onValueChange={setListeningScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-primary" />
              整体感受
            </CardTitle>
            <CardDescription>
              今天和TA在一起的整体感受如何？
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>不愉快</span>
                <span className="font-semibold text-lg text-foreground">{overallFeeling[0]}/10</span>
                <span>很愉快</span>
              </div>
              <Slider
                value={overallFeeling}
                onValueChange={setOverallFeeling}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>备注</CardTitle>
            <CardDescription>
              记录今天特别的事情或想说的话（可选）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="今天发生了什么特别的事..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {notes.length}/500
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? '提交中...' : hasRatedToday ? '更新评分' : '提交评分'}
        </Button>
      </div>
    </div>
  );
};

export default DailyRating;
