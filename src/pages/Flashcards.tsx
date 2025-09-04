import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { RotateCcw, Trash2, Eye, EyeOff, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export default function Flashcards() {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFlashcards();
    }
  }, [user]);

  const fetchFlashcards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Kartları rastgele sırala
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      setFlashcards(shuffled);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } catch (error: any) {
      console.error('Error fetching flashcards:', error);
      toast.error('Flashcardlar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFlashcard = async (flashcardId: string) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', flashcardId);

      if (error) throw error;

      const newFlashcards = flashcards.filter(card => card.id !== flashcardId);
      setFlashcards(newFlashcards);
      
      // Mevcut kart silinmişse ve son kart değilse, aynı indeksi koru
      if (currentCardIndex >= newFlashcards.length && newFlashcards.length > 0) {
        setCurrentCardIndex(newFlashcards.length - 1);
      }
      
      setShowAnswer(false);
      toast.success('Flashcard silindi');
    } catch (error: any) {
      console.error('Error deleting flashcard:', error);
      toast.error('Flashcard silinirken hata oluştu');
    }
  };

  const nextCard = () => {
    if (flashcards.length > 0) {
      setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
      setShowAnswer(false);
    }
  };

  const previousCard = () => {
    if (flashcards.length > 0) {
      setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
      setShowAnswer(false);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    toast.success('Kartlar karıştırıldı!');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Lütfen giriş yapın.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Flashcards
            </h1>
            <p className="text-muted-foreground">
              Oluşturduğunuz flashcard'larla çalışın.
            </p>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Henüz flashcard'ınız yok.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Timeline'daki okuma kartlarından flashcard oluşturabilirsiniz.
            </p>
            <Button asChild>
              <a href="/timeline">Timeline'a Git</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Flashcards
          </h1>
          <p className="text-muted-foreground">
            Oluşturduğunuz flashcard'larla çalışın. ({currentCardIndex + 1}/{flashcards.length})
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <Button onClick={shuffleCards} variant="outline" className="flex items-center space-x-2">
              <Shuffle className="h-4 w-4" />
              <span>Karıştır</span>
            </Button>
            <div className="flex space-x-2">
              <Button onClick={previousCard} variant="outline" disabled={flashcards.length <= 1}>
                ← Önceki
              </Button>
              <Button onClick={nextCard} variant="outline" disabled={flashcards.length <= 1}>
                Sonraki →
              </Button>
            </div>
          </div>

          <Card className="bg-gradient-card border-accent/20 min-h-[400px]">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">
                  {showAnswer ? 'Cevap' : 'Soru'}
                </CardTitle>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteFlashcard(currentCard.id)}
                  className="flex items-center space-x-1"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="min-h-[200px] flex items-center">
                <p className="text-lg leading-relaxed">
                  {showAnswer ? currentCard.answer : currentCard.question}
                </p>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="flex items-center space-x-2"
                  size="lg"
                >
                  {showAnswer ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span>Soruyu Göster</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Cevabı Göster</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Oluşturulma: {new Date(currentCard.created_at).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}