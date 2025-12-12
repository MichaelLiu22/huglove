-- Create a function to get user count that can be called without authentication
CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.profiles;
$$;