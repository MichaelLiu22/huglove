import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AnniversaryCard } from "@/components/AnniversaryCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Calendar } from "lucide-react";
import { calculateAnniversaries } from "@/lib/dateCalculations";
import { parseDateInLA } from "@/lib/timezoneUtils";

const AnniversaryHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pastAnniversaries, setPastAnniversaries] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAnniversaries();
    }
  }, [user]);

  const loadAnniversaries = async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const metDate = parseDateInLA(data.met_date);
        const togetherDate = parseDateInLA(data.together_date);
        const allAnniversaries = calculateAnniversaries(metDate, togetherDate);
        const past = allAnniversaries.filter(a => a.isPast);
        setPastAnniversaries(past);
      }
    } catch (error: any) {
      console.error('Error loading anniversaries:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-soft p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">纪念日历史</h1>
          <p className="text-muted-foreground">回顾你们一起走过的每一个重要时刻</p>
        </div>

        {pastAnniversaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">还没有已度过的纪念日</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              返回首页
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastAnniversaries.map((anniversary) => (
              <AnniversaryCard key={anniversary.id} {...anniversary} isPast={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnniversaryHistory;
