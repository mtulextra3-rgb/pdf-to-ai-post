-- Fix the function search path security issue
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres, anon, authenticated, service_role;