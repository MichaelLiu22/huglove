import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const RatingHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadRatings();
    }
  }, [user]);

  const loadRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_ratings')
        .select('*')
        .eq('rater_id', user?.id)
        .order('rating_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRatings(data || []);
    } catch (error: any) {
      console.error('Error loading ratings:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const chartData = ratings
    .slice()
    .reverse()
    .map(r => ({
      date: new Date(r.rating_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      沟通: r.communication_score,
      共情: r.empathy_score,
      倾听: r.listening_score,
      整体: r.overall_feeling
    }));

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

  return (
    <div className="min-h-screen bg-gradient-soft p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/rating')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">评分历史</h1>
          <p className="text-muted-foreground">查看最近30天的评分趋势</p>
        </div>

        {ratings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">还没有评分记录</p>
              <Button onClick={() => navigate('/rating')} className="mt-4">
                去评分
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>评分趋势图</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="沟通" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="共情" stroke="#ec4899" strokeWidth={2} />
                    <Line type="monotone" dataKey="倾听" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="整体" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-bold">详细记录</h2>
              {ratings.map((rating) => (
                <Card key={rating.id} className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {new Date(rating.rating_date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">沟通</p>
                        <p className="text-2xl font-bold text-primary">{rating.communication_score}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">共情</p>
                        <p className="text-2xl font-bold text-primary">{rating.empathy_score}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">倾听</p>
                        <p className="text-2xl font-bold text-primary">{rating.listening_score}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">整体</p>
                        <p className="text-2xl font-bold text-primary">{rating.overall_feeling}</p>
                      </div>
                    </div>
                    {rating.notes && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">备注：</p>
                        <p className="text-sm">{rating.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RatingHistory;
