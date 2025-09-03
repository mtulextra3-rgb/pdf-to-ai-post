-- Add image_url column to posts table for storing Unsplash image URLs
ALTER TABLE public.posts 
ADD COLUMN image_url TEXT;

-- Add an index for better performance when filtering by image_url
CREATE INDEX idx_posts_image_url ON public.posts(image_url) WHERE image_url IS NOT NULL;