import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { Copy, Trash2, Share2, BookOpen } from 'lucide-react';
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
          <div className="space-y-8">
            {savedCards.map((savedCard, index) => (
              <Card key={savedCard.id} className="group bg-gradient-card border-accent/20 hover:shadow-elegant transition-all duration-500 hover:border-accent/40 overflow-hidden">
                {/* Desktop Layout */}
                <div className="hidden md:block">
                  {(index % 3 === 0) && savedCard.posts.image_url && (
                    <div className="relative w-full h-72 overflow-hidden">
                      <img
                        src={savedCard.posts.image_url}
                        alt="Post illustration"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
                    </div>
                  )}
                  
                  <div className={`flex ${index % 3 === 1 ? 'flex-row-reverse' : index % 3 === 2 ? 'flex-row' : 'flex-col'}`}>
                    {index % 3 !== 0 && savedCard.posts.image_url && (
                      <div className="relative w-80 h-72 flex-shrink-0 overflow-hidden">
                        <img
                          src={savedCard.posts.image_url}
                          alt="Post illustration"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent" />
                      </div>
                    )}
                    
                    <div className="flex-1 p-8">
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium">{savedCard.posts.pdfs?.title || 'Bilinmeyen PDF'}</span>
                            <span className="text-muted-foreground/60">•</span>
                            <span>Kaydedilme: {new Date(savedCard.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                          
                          <h2 className="text-2xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors duration-300">
                            {savedCard.posts.title}
                          </h2>
                        </div>
                        
                        {/* Content */}
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                          <p className="text-lg leading-[1.8] text-foreground/90 font-normal tracking-wide" style={{fontFamily: 'var(--font-reading)'}}>
                            {savedCard.posts.content}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions - Always at bottom */}
                      <div className="p-8 pt-0">
                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                          <div className="flex items-center space-x-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyContent(savedCard.posts.content)}
                              className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Kopyala
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShare(savedCard.posts)}
                              className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Paylaş
                            </Button>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUnsaveCard(savedCard.id)}
                            className="transition-all duration-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Kaldır
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden">
                  {savedCard.posts.image_url && (
                    <div className="relative w-full h-56 overflow-hidden">
                      <img
                        src={savedCard.posts.image_url}
                        alt="Post illustration"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
                    </div>
                  )}
                  
                  <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium">{savedCard.posts.pdfs?.title || 'Bilinmeyen PDF'}</span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>Kaydedilme: {new Date(savedCard.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      
                      <h2 className="text-xl font-bold leading-tight text-foreground">
                        {savedCard.posts.title}
                      </h2>
                    </div>
                    
                    {/* Content */}
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p className="text-base leading-[1.8] text-foreground/90 font-normal" style={{fontFamily: 'var(--font-reading)'}}>
                        {savedCard.posts.content}
                      </p>
                    </div>
                    
                    {/* Actions - Always at bottom */}
                    <div className="space-y-3 pt-4 border-t border-border/40">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyContent(savedCard.posts.content)}
                          className="justify-center hover:bg-primary/10 hover:text-primary"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Kopyala
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShare(savedCard.posts)}
                          className="justify-center hover:bg-primary/10 hover:text-primary"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Paylaş
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUnsaveCard(savedCard.id)}
                        className="w-full justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Kaldır
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}