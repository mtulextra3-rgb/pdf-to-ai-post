-- Add foreign key constraint from saved_cards to posts
ALTER TABLE public.saved_cards 
ADD CONSTRAINT fk_saved_cards_post_id 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;