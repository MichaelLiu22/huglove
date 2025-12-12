import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Lock, User, Users } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  username: z.string()
    .min(3, { message: '用户名至少需要3个字符' })
    .max(20, { message: '用户名最多20个字符' })
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, { message: '用户名只能包含字母、数字、下划线和中文' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
  nickname: z.string().optional(),
});

// Animated counter hook
const useAnimatedCounter = (targetValue: number, duration: number = 1500) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (targetValue === 0) return;
    
    let startTime: number;
    let animationFrame: number;
    const startValue = count;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startValue + easeOut * (targetValue - startValue)));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, duration]);
  
  return count;
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [realUserCount, setRealUserCount] = useState(0);
  const { signIn, signUp } = useAuth();

  const userCount = useAnimatedCounter(realUserCount);

  // Fetch real user count and subscribe to real-time updates
  useEffect(() => {
    const fetchUserCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setRealUserCount(count * 3); // Multiply by 3
      }
    };

    fetchUserCount();

    // Subscribe to real-time inserts on profiles table
    const channel = supabase
      .channel('user-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // When new user registers, increment by 3
          setRealUserCount(prev => prev + 3);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Check for signup mode from URL
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validatedData = authSchema.parse({
        username,
        password,
        nickname: isLogin ? undefined : nickname
      });

      if (isLogin) {
        await signIn(validatedData.username, validatedData.password);
      } else {
        await signUp(validatedData.username, validatedData.password, validatedData.nickname);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-soft">
      <Card className="w-full max-w-md p-8 animate-fade-in shadow-card bg-card/80 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            {isLogin ? '欢迎回来' : '加入我们'}
          </h1>
          <p className="text-muted-foreground mb-4">
            欢迎使用Michael AI，与AI同行！
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary animate-fade-in">
            <Users className="w-4 h-4" />
            <span>已有 <strong className="text-lg tabular-nums">{userCount.toLocaleString()}</strong> 个用户注册</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-card-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              用户名
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={isLogin ? "输入你的用户名" : "3-20个字符"}
              className="bg-background border-border focus:ring-primary"
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-card-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                昵称（可选）
              </Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入你的昵称，默认使用用户名"
                className="bg-background border-border focus:ring-primary"
              />
              {errors.nickname && (
                <p className="text-sm text-destructive">{errors.nickname}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-card-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              密码
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isLogin ? '输入你的密码' : '至少6个字符'}
              className="bg-background border-border focus:ring-primary"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:opacity-90 text-white font-medium py-6 text-lg shadow-soft"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
          </button>
        </div>
      </Card>
    </div>
  );
}
