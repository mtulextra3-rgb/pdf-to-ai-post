import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, BookOpen, Bookmark, Zap } from 'lucide-react';
import { FlashcardDialog } from '@/components/FlashcardDialog';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';

interface Post {
  id: string;
  title: string;
  content: string;
  post_order: number;
  created_at: string;
  image_url?: string;
  pdf_title?: string;
  pdfs?: {
    title: string;
  };
}

export default function Timeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [flashcardDialog, setFlashcardDialog] = useState<{
    isOpen: boolean;
    postContent: string;
  }>({ isOpen: false, postContent: '' });
  
  const selectedPdfId = searchParams.get('pdf');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPosts();
    fetchSavedCards();
  }, [user, navigate, selectedPdfId]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          pdfs (
            title
          )
        `)
        .eq('user_id', user?.id);

      // Filter by specific PDF if selected
      if (selectedPdfId) {
        query = query.eq('pdf_id', selectedPdfId);
      }

      const { data, error } = await query.order('post_order', { ascending: true });

      if (error) throw error;

      const postsWithPdfTitle = data?.map(post => ({
        ...post,
        pdf_title: post.pdfs?.title || 'Bilinmeyen PDF'
      })) || [];

      setPosts(postsWithPdfTitle);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Kartlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedCards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_cards')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const savedPostIds = new Set(data?.map(item => item.post_id) || []);
      setSavedCards(savedPostIds);
    } catch (error: any) {
      console.error('Error fetching saved cards:', error);
    }
  };

  const handleSaveCard = async (postId: string) => {
    if (!user) return;

    try {
      if (savedCards.has(postId)) {
        // Unsave the card
        const { error } = await supabase
          .from('saved_cards')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
        
        setSavedCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        toast.success('Kart kaydedilenlerden kaldırıldı');
      } else {
        // Save the card
        const { error } = await supabase
          .from('saved_cards')
          .insert({
            user_id: user.id,
            post_id: postId
          });

        if (error) throw error;
        
        setSavedCards(prev => new Set([...prev, postId]));
        toast.success('Kart kaydedilenlere eklendi!');
      }
    } catch (error: any) {
      console.error('Error saving/unsaving card:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleCreateFlashcard = (postContent: string) => {
    setFlashcardDialog({
      isOpen: true,
      postContent
    });
  };

  const handleCopyPost = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Kart içeriği panoya kopyalandı!');
    } catch (error) {
      toast.error('Kopyalama başarısız');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async (post: Post) => {
    const shareText = `${post.title}\n\n${post.content}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: shareText,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('İçerik panoya kopyalandı!');
    }
  };

  const ReadingCard = ({ post, index }: { post: Post; index: number }) => {
    const { ref, inView } = useInView({
      threshold: 0.1,
      triggerOnce: true,
    });

    // Randomly determine layout for desktop
    const layouts = ['top', 'left', 'right'];
    const layout = layouts[index % layouts.length];

    return (
      <div
        ref={ref}
        className={`transform transition-all duration-700 ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <Card className="bg-gradient-card border-accent/20 hover:shadow-elegant transition-all duration-300">
          {/* Desktop Layout */}
          <div className="hidden md:block">
            {layout === 'top' && post.image_url && (
              <div className="w-full h-80">
                <img
                  src={post.image_url}
                  alt="Post illustration"
                  className="w-full h-full object-cover rounded-t-lg"
                />
              </div>
            )}
            
            <div className={`flex ${layout === 'left' ? 'flex-row-reverse' : layout === 'right' ? 'flex-row' : 'flex-col'}`}>
              {layout !== 'top' && post.image_url && (
                <div className="w-80 h-64 flex-shrink-0">
                  <img
                    src={post.image_url}
                    alt="Post illustration"
                    className={`w-full h-full object-cover ${
                      layout === 'left' ? 'rounded-r-lg' : 'rounded-l-lg'
                    }`}
                  />
                </div>
              )}
              
              <div className="flex-1">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-bold leading-tight">
                      {post.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    <BookOpen className="inline h-4 w-4 mr-1" />
                    {post.pdf_title} • {formatDate(post.created_at)}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-foreground/90 leading-relaxed">
                    {post.content}
                  </p>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPost(post.content)}
                        className="flex items-center space-x-1"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Kopyala</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShare(post)}
                        className="flex items-center space-x-1"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Paylaş</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={savedCards.has(post.id) ? "default" : "outline"}
                        onClick={() => handleSaveCard(post.id)}
                        className="flex items-center space-x-1"
                      >
                        <Bookmark className="h-4 w-4" />
                        <span>{savedCards.has(post.id) ? 'Kaydedildi' : 'Kaydet'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateFlashcard(post.content)}
                        className="flex items-center space-x-1"
                      >
                        <Zap className="h-4 w-4" />
                        <span>Flashcard</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>
          </div>

          {/* Mobile Layout - Always image on top */}
          <div className="md:hidden">
            {post.image_url && (
              <div className="w-full h-60">
                <img
                  src={post.image_url}
                  alt="Post illustration"
                  className="w-full h-full object-cover rounded-t-lg"
                />
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg font-bold leading-tight">
                  {post.title}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                <BookOpen className="inline h-4 w-4 mr-1" />
                {post.pdf_title} • {formatDate(post.created_at)}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed text-sm">
                {post.content}
              </p>
              
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyPost(post.content)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Kopyala</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare(post)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Paylaş</span>
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={savedCards.has(post.id) ? "default" : "outline"}
                    onClick={() => handleSaveCard(post.id)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>{savedCards.has(post.id) ? 'Kaydedildi' : 'Kaydet'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateFlashcard(post.content)}
                    className="flex items-center space-x-1 flex-1"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Flashcard</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {selectedPdfId ? 'PDF Timeline' : 'Okuma Kartları'}
          </h1>
          <p className="text-muted-foreground">
            {selectedPdfId 
              ? 'Seçili PDF\'den oluşturulan okuma kartları' 
              : 'AI tarafından PDF\'lerinizden oluşturulan okuma kartları'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Kartlar yükleniyor...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {selectedPdfId ? 'Bu PDF için henüz kart oluşturulmamış.' : 'Henüz okuma kartınız yok.'}
            </p>
            <Button asChild>
              <a href="/upload">PDF Yükle</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post, index) => (
              <ReadingCard key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
        
        <FlashcardDialog
          isOpen={flashcardDialog.isOpen}
          onClose={() => setFlashcardDialog({ isOpen: false, postContent: '' })}
          postContent={flashcardDialog.postContent}
        />
      </div>
    </div>
  );
}