import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FlashcardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postContent: string;
}

export const FlashcardDialog = ({ isOpen, onClose, postContent }: FlashcardDialogProps) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set default values when dialog opens
  useState(() => {
    if (isOpen && postContent) {
      const words = postContent.trim().split(' ');
      const defaultQuestion = words.slice(0, 2).join(' ');
      setQuestion(defaultQuestion);
      setAnswer(postContent);
    }
  });

  const handleCreateFlashcard = async () => {
    if (!user || !question.trim() || !answer.trim()) {
      toast.error('Lütfen soru ve cevap alanlarını doldurun');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          question: question.trim(),
          answer: answer.trim()
        });

      if (error) throw error;

      toast.success('Flashcard başarıyla oluşturuldu!');
      onClose();
      setQuestion('');
      setAnswer('');
    } catch (error: any) {
      console.error('Error creating flashcard:', error);
      toast.error('Flashcard oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setQuestion('');
      setAnswer('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Flashcard Oluştur</DialogTitle>
          <DialogDescription>
            Bu karttan bir flashcard oluşturun. Soru ve cevap alanlarını istediğiniz gibi düzenleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Soru</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Flashcard sorusunu girin..."
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="answer">Cevap</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Flashcard cevabını girin..."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleCreateFlashcard} disabled={isLoading}>
            {isLoading ? 'Oluşturuluyor...' : 'Flashcard Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};