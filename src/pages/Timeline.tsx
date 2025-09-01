import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';

interface Post {
  id: string;
  title: string;
  content: string;
  post_order: number;
  created_at: string;
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
  const selectedPdfId = searchParams.get('pdf');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPosts();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-muted-foreground">Yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }

  // Reading card component
  const ReadingCard = ({ post, index }: { post: Post; index: number }) => {
    const { ref, inView } = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    // Use full content as card content (no title extraction)
    const cardContent = post.content.trim();

    // Generate unique floral oil painting image from Unsplash
    const getRandomImageUrl = () => {
      const seed = post.id.substring(0, 8); // Use part of post ID as seed for consistency
      return `https://source.unsplash.com/800x600/?flower,oil-painting,art&sig=${seed}`;
    };

    // Get random position for image (top, right, left)
    const getRandomPosition = () => {
      const positions = ['top', 'right', 'left'];
      const hash = post.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return positions[Math.abs(hash) % positions.length];
    };

    const imagePosition = getRandomPosition();
    
    // Determine if text is short (less than 400 characters)
    const isShortText = cardContent.length < 400;

    return (
      <div
        ref={ref}
        className={`transition-all duration-700 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <Card className="bg-card shadow-elegant border-border hover:shadow-glow transition-all duration-300 overflow-hidden group">
          {/* Desktop Layout - Adaptive based on text length */}
          <div className="hidden md:block">
            {isShortText ? (
              // Short text: Random positioned image with text
              <div className={`${
                imagePosition === 'top' ? 'flex flex-col' :
                imagePosition === 'right' ? 'flex flex-row-reverse' :
                'flex flex-row'
              }`}>
                <div className={`relative overflow-hidden ${
                  imagePosition === 'top' ? 'h-48 w-full' :
                  'h-64 w-64 flex-shrink-0'
                }`}>
                  <img 
                    src={getRandomImageUrl()}
                    alt="Floral oil painting illustration"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://source.unsplash.com/800x600/?oil-painting,flowers,art&sig=${Math.random()}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/30" />
                </div>
                <div className="p-6 flex-1">
                  <CardHeader className="p-0 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {post.pdf_title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Kart {post.post_order}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="prose prose-xl max-w-none text-card-foreground mb-4">
                      <p className="whitespace-pre-wrap leading-relaxed text-xl">
                        {cardContent}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleCopyPost(post.content)}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            ) : (
              // Long text: No image for readability
              <div className="p-6">
                  <CardHeader className="p-0 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {post.pdf_title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Kart {post.post_order}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="prose prose-xl max-w-none text-card-foreground mb-4">
                      <p className="whitespace-pre-wrap leading-relaxed text-xl">
                        {cardContent}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleCopyPost(post.content)}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
            )}
          </div>

          {/* Mobile Layout - Conditional image for short text */}
          <div className="md:hidden">
            {isShortText && (
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={getRandomImageUrl()}
                  alt="Floral oil painting illustration"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://source.unsplash.com/800x600/?oil-painting,flowers,art&sig=${Math.random()}`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/30" />
              </div>
            )}
            <div className="p-6">
              <CardHeader className="p-0 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {post.pdf_title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Kart {post.post_order}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="prose prose-xl max-w-none text-card-foreground mb-4">
                  <p className="whitespace-pre-wrap leading-relaxed text-xl">
                    {cardContent}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(post.created_at)}
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleCopyPost(post.content)}
                      variant="ghost"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {selectedPdfId ? 'Okuma Kartları' : 'Timeline'}
          </h1>
          <p className="text-muted-foreground">
            {selectedPdfId 
              ? 'Seçilen PDF\'den oluşturulan okuma kartları' 
              : 'PDF\'lerden oluşturulan tüm okuma kartlarınız'}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <div className="text-lg text-muted-foreground mb-4">
              {selectedPdfId ? 'Bu PDF için henüz kart oluşturulmamış' : 'Henüz hiç okuma kartı oluşturulmamış'}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              PDF yükleyip AI ile işlettikten sonra okuma kartlarınız burada görünecek
            </p>
            <Button onClick={() => navigate('/upload')} className="bg-primary hover:bg-primary/90">
              PDF Yükle
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post, index) => (
              <ReadingCard key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}