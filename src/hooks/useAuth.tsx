import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname?: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 设置auth状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // 检查现有session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      // 如果不包含@，说明是用户名，转换为内部邮箱格式
      const email = emailOrUsername.includes('@') 
        ? emailOrUsername 
        : `${emailOrUsername}@couples.app`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
      throw error;
    }
  };

  const signUp = async (username: string, password: string, nickname?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // 使用用户名生成内部邮箱格式
      const email = username.includes('@') ? username : `${username}@couples.app`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nickname: nickname || username.split('@')[0],
            username: username.split('@')[0]
          }
        }
      });
      
      if (error) throw error;
      
      // Check for pending invitation
      const pendingInvitation = sessionStorage.getItem('pending_invitation');
      if (pendingInvitation && data.user) {
        const invitationData = JSON.parse(pendingInvitation);
        
        // Accept the invitation automatically
        setTimeout(async () => {
          try {
            const { data: invitation, error: invError } = await supabase
              .from('partner_invitations')
              .select('*, relationships(*)')
              .eq('invitation_code', invitationData.code)
              .eq('status', 'pending')
              .maybeSingle();

            if (invError || !invitation) throw invError;

            // Update inviter's relationship
            await supabase
              .from('relationships')
              .update({ partner_id: data.user.id })
              .eq('id', invitation.relationship_id);

            // Create relationship for the new user
            await supabase
              .from('relationships')
              .insert({
                user_id: data.user.id,
                partner_id: invitation.inviter_id,
                met_date: invitationData.met_date,
                together_date: invitation.relationships.together_date,
                relationship_status: 'active'
              });

            // Update invitation status
            await supabase
              .from('partner_invitations')
              .update({ status: 'accepted' })
              .eq('id', invitation.id);

            sessionStorage.removeItem('pending_invitation');
            toast.success('已成功关联伴侣！');
          } catch (error: any) {
            console.error('Error accepting invitation:', error);
          }
        }, 2000);
      }
      
      toast.success('注册成功！正在为你登录...');
      navigate('/');
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        toast.error('该用户名已被注册');
      } else {
        toast.error(error.message || '注册失败');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('已退出登录');
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || '退出失败');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
