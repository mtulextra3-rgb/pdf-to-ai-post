-- Create saved_cards table
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_cards
CREATE POLICY "Users can view their own saved cards" 
ON public.saved_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved cards" 
ON public.saved_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards" 
ON public.saved_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for flashcards
CREATE POLICY "Users can view their own flashcards" 
ON public.flashcards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcards" 
ON public.flashcards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" 
ON public.flashcards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" 
ON public.flashcards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for flashcards updated_at
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint to prevent duplicate saved cards
ALTER TABLE public.saved_cards ADD CONSTRAINT unique_user_post UNIQUE (user_id, post_id);