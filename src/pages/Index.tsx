import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { DateSetup } from "@/components/DateSetup";
import { AnniversaryCard } from "@/components/AnniversaryCard";
import { calculateAnniversaries, getDaysTogether } from "@/lib/dateCalculations";
import { Heart, Calendar, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metDate, setMetDate] = useState<Date | null>(null);
  const [togetherDate, setTogetherDate] = useState<Date | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else {
        loadRelationshipData();
      }
    }
  }, [user, authLoading, navigate]);

  const loadRelationshipData = async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setMetDate(new Date(data.met_date));
        setTogetherDate(new Date(data.together_date));
        setShowSetup(false);
      }
    } catch (error: any) {
      console.error('Error loading relationship:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDatesSet = async (met: Date, together: Date) => {
    try {
      const { error } = await supabase
        .from('relationships')
        .upsert({
          user_id: user?.id,
          met_date: met.toISOString().split('T')[0],
          together_date: together.toISOString().split('T')[0],
          relationship_status: 'active'
        });

      if (error) throw error;

      setMetDate(met);
      setTogetherDate(together);
      setShowSetup(false);
      toast.success('数据保存成功！');
    } catch (error: any) {
      console.error('Error saving relationship:', error);
      toast.error('保存失败，请重试');
    }
  };

  const handleReset = () => {
    setMetDate(null);
    setTogetherDate(null);
    setShowSetup(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (showSetup || !metDate || !togetherDate) {
    return <DateSetup onDatesSet={handleDatesSet} />;
  }

  const anniversaries = calculateAnniversaries(metDate, togetherDate);
  const daysTogether = getDaysTogether(togetherDate);
  const upcomingAnniversaries = anniversaries.filter(a => !a.isPast && a.daysUntil <= 30);
  const pastAnniversaries = anniversaries.filter(a => a.isPast);

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6 shadow-soft">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Heart className="w-6 h-6" fill="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">我们的小空间</h1>
                <p className="text-white/80 text-sm">记录每一个美好时刻</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                重新设置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm text-white/80">相识于</span>
              </div>
              <p className="text-lg font-semibold">
                {metDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4" fill="white" />
                <span className="text-sm text-white/80">在一起</span>
              </div>
              <p className="text-lg font-semibold">
                {togetherDate.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm text-white/80">已经在一起</span>
              </div>
              <p className="text-lg font-semibold">
                {daysTogether} 天
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Upcoming Anniversaries */}
        {upcomingAnniversaries.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
              <h2 className="text-2xl font-bold text-foreground">即将到来</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAnniversaries.map((anniversary) => (
                <AnniversaryCard key={anniversary.id} {...anniversary} />
              ))}
            </div>
          </section>
        )}

        {/* All Future Anniversaries */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
            <h2 className="text-2xl font-bold text-foreground">未来的纪念日</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anniversaries
              .filter(a => !a.isPast && a.daysUntil > 30)
              .map((anniversary) => (
                <AnniversaryCard key={anniversary.id} {...anniversary} />
              ))}
          </div>
        </section>

        {/* Past Anniversaries */}
        {pastAnniversaries.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-muted rounded-full"></div>
              <h2 className="text-2xl font-bold text-foreground">已度过的纪念日</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastAnniversaries.slice(0, 6).map((anniversary) => (
                <AnniversaryCard key={anniversary.id} {...anniversary} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Index;
