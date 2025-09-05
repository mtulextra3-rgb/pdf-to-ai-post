import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { Copy, Trash2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface SavedCard {
  id: string;
  post_id: string;
  created_at: string;
  posts: {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    created_at: string;
    pdfs: {
      title: string;
    } | null;
  };
}

export default function SavedCards() {
  const { user } = useAuth();
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedCards();
    }
  }, [user]);

  const fetchSavedCards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_cards')
        .select(`
          id,
          post_id,
          created_at,
          posts (
            id,
            title,
            content,
            image_url,
            created_at,
            pdfs (
              title
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedCards(data || []);
    } catch (error: any) {
      console.error('Error fetching saved cards:', error);
      toast.error('Kaydedilen kartlar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsaveCard = async (savedCardId: string) => {
    try {
      const { error } = await supabase
        .from('saved_cards')
        .delete()
        .eq('id', savedCardId);

      if (error) throw error;

      setSavedCards(prev => prev.filter(card => card.id !== savedCardId));
      toast.success('Kart kaydedilenlerden kaldırıldı');
    } catch (error: any) {
      console.error('Error removing saved card:', error);
      toast.error('Kart kaldırılırken hata oluştu');
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('İçerik panoya kopyalandı!');
  };

  const handleShare = (post: SavedCard['posts']) => {
    const shareText = `${post.title}\n\n${post.content}`;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('İçerik panoya kopyalandı!');
    }
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

  return (
    <div className="min-h-screen bg-gradient-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Kaydedilen Kartlar
          </h1>
          <p className="text-muted-foreground">
            Kaydettiğiniz okuma kartlarını görüntüleyin ve yönetin.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : savedCards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Henüz kaydedilmiş kartınız yok.</p>
            <Button asChild>
              <a href="/timeline">Timeline'a Git</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {savedCards.map((savedCard) => (
              <Card key={savedCard.id} className="bg-gradient-card border-accent/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg mb-2">{savedCard.posts.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {savedCard.posts.pdfs?.title && `PDF: ${savedCard.posts.pdfs.title} • `}
                        Kaydedilme: {new Date(savedCard.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    {savedCard.posts.image_url && (
                      <img
                        src={savedCard.posts.image_url}
                        alt="Post image"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/90 mb-4 leading-relaxed">
                    {savedCard.posts.content}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyContent(savedCard.posts.content)}
                        className="flex items-center space-x-1"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Kopyala</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShare(savedCard.posts)}
                        className="flex items-center space-x-1"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Paylaş</span>
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUnsaveCard(savedCard.id)}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Kaldır</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}