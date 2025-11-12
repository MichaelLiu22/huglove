import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface InvitationData {
  id: string;
  inviter_id: string;
  relationship_id: string;
  recipient_name: string;
  met_date: string;
  love_message: string;
  status: string;
}

const InvitationAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationCode = searchParams.get('code');
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (!invitationCode) {
      toast.error('邀请码无效');
      navigate('/auth');
      return;
    }
    loadInvitation();
  }, [invitationCode]);

  useEffect(() => {
    // Show letter after 3 seconds of animation
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      setShowLetter(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('邀请码无效或已过期');
        navigate('/auth');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        toast.error('邀请码已过期');
        navigate('/auth');
        return;
      }

      setInvitation(data);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      toast.error('加载邀请失败');
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    // Store invitation data in sessionStorage for after registration
    if (invitation) {
      sessionStorage.setItem('pending_invitation', JSON.stringify({
        code: invitationCode,
        inviter_id: invitation.inviter_id,
        relationship_id: invitation.relationship_id,
        met_date: invitation.met_date,
      }));
      
      toast.success('请先注册账号');
      navigate('/auth?mode=signup');
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

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated Background Elements */}
      {!animationComplete && (
        <>
          {/* Love Bubbles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={`bubble-${i}`}
              className="absolute animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <Heart
                className="text-primary/30"
                fill="currentColor"
                size={20 + Math.random() * 20}
              />
            </div>
          ))}

          {/* Roses */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`rose-${i}`}
              className="absolute text-4xl animate-fade-in"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            >
              🌹
            </div>
          ))}
        </>
      )}

      {/* Love Letter */}
      <div
        className={`relative z-10 transition-all duration-1000 ${
          showLetter
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
        }`}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-card/95 backdrop-blur-sm rounded-3xl shadow-elegant p-8 md:p-12 border-2 border-primary/20">
            {/* Envelope Icon */}
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-gradient-primary rounded-full mb-4 animate-pulse">
                <Heart className="w-12 h-12 text-white" fill="white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                给你的一封信
              </h1>
              <div className="w-16 h-1 bg-gradient-primary rounded-full mx-auto"></div>
            </div>

            {/* Letter Content */}
            <div className="space-y-6 text-foreground">
              <p className="text-lg leading-relaxed">
                亲爱的 <span className="text-primary font-semibold text-xl">{invitation.recipient_name}</span>：
              </p>

              <p className="text-base leading-relaxed indent-8">
                我们相识于{' '}
                <span className="text-primary font-semibold">
                  {format(new Date(invitation.met_date), 'yyyy年M月d日', { locale: zhCN })}
                </span>
                ，那是一个特别的日子。
              </p>

              <p className="text-base leading-relaxed indent-8">
                {invitation.love_message}
              </p>

              <div className="pt-6 text-right text-muted-foreground italic">
                <p>永远爱你的人</p>
                <p className="mt-2">📝</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <Button
                onClick={handleAccept}
                className="w-full bg-gradient-primary text-white hover:opacity-90 transition-opacity py-6 text-lg"
                size="lg"
              >
                <Heart className="mr-2" fill="white" />
                接受邀请，开启我们的小空间
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                点击后需要先注册账号
              </p>
            </div>
          </div>

          {/* Decorative Hearts */}
          <div className="absolute -top-4 -right-4 text-6xl animate-bounce">
            💕
          </div>
          <div className="absolute -bottom-4 -left-4 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>
            💖
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InvitationAccept;
