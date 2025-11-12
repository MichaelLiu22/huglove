-- 创建用户配置表
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看和更新自己的资料
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 创建情侣关系表
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  met_date DATE NOT NULL,
  together_date DATE NOT NULL,
  relationship_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 启用RLS
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看和管理自己的关系
CREATE POLICY "Users can view their own relationship"
  ON public.relationships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can insert their own relationship"
  ON public.relationships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relationship"
  ON public.relationships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- 创建每日评分表（基于非暴力沟通理念）
CREATE TABLE public.daily_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating_date DATE NOT NULL,
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  empathy_score INTEGER CHECK (empathy_score >= 1 AND empathy_score <= 5),
  listening_score INTEGER CHECK (listening_score >= 1 AND listening_score <= 5),
  overall_feeling INTEGER CHECK (overall_feeling >= 1 AND overall_feeling <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rater_id, rated_id, rating_date)
);

-- 启用RLS
ALTER TABLE public.daily_ratings ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户可以查看和创建自己给出的评分
CREATE POLICY "Users can view ratings in their relationship"
  ON public.daily_ratings FOR SELECT
  USING (
    auth.uid() = rater_id OR auth.uid() = rated_id
  );

CREATE POLICY "Users can create their own ratings"
  ON public.daily_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can update their own ratings"
  ON public.daily_ratings FOR UPDATE
  USING (auth.uid() = rater_id);

-- 创建约会推荐表
CREATE TABLE public.date_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,
  location_name TEXT NOT NULL,
  location_type TEXT,
  description TEXT,
  weather_condition TEXT,
  temperature TEXT,
  reason TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.date_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS策略：关系中的双方都可以查看推荐
CREATE POLICY "Users can view their relationship suggestions"
  ON public.date_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_suggestions.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create suggestions for their relationship"
  ON public.date_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their relationship suggestions"
  ON public.date_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_suggestions.relationship_id
      AND (relationships.user_id = auth.uid() OR relationships.partner_id = auth.uid())
    )
  );

-- 创建触发器函数来自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表添加触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 为 relationships 表添加触发器
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 创建触发器来自动创建用户配置
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();