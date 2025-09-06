-- Add new columns to pdfs table for public/private functionality
ALTER TABLE public.pdfs 
ADD COLUMN is_public boolean DEFAULT false,
ADD COLUMN author_name text,
ADD COLUMN description text,
ADD COLUMN view_count integer DEFAULT 0,
ADD COLUMN cover_image_url text;

-- Create RLS policy for public PDFs that everyone can view
CREATE POLICY "Everyone can view public PDFs" 
ON public.pdfs 
FOR SELECT 
USING (is_public = true);

-- Update existing RLS policy name to be more specific
DROP POLICY "Users can view their own PDFs" ON public.pdfs;
CREATE POLICY "Users can view their own PDFs" 
ON public.pdfs 
FOR SELECT 
USING (auth.uid() = user_id AND is_public = false);

-- Add trigger to update view count
CREATE OR REPLACE FUNCTION public.increment_pdf_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pdfs 
  SET view_count = view_count + 1 
  WHERE id = NEW.pdf_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;