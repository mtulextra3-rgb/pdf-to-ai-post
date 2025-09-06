-- Fix the function security warning by setting search_path
CREATE OR REPLACE FUNCTION public.increment_pdf_view_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE public.pdfs 
  SET view_count = view_count + 1 
  WHERE id = NEW.pdf_id;
  RETURN NEW;
END;
$$;