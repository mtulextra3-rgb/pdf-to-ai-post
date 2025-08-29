import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Share2, Copy, FileText, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  title: string;
  content: string;
  post_order: number;
  created_at: string;
  pdfs: {
    title: string;
  };
}

export default function Timeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPosts();
  }, [user, navigate]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          pdfs!inner(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error('Postlar yüklenirken hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPost = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Post panoya kopyalandı!');
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Post Timeline
          </h1>
          <p className="text-muted-foreground mt-2">
            AI tarafından oluşturulan sosyal medya postlarınız
          </p>
        </div>

        {loading ? (
          <Card className="bg-gradient-card border-border">
            <CardContent className="py-8 text-center">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="bg-gradient-card border-border">
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground mb-4">
                Henüz post yok. PDF yükleyip AI ile postlara dönüştürün!
              </div>
              <Button onClick={() => navigate('/upload')} variant="hero">
                PDF Yükle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="bg-gradient-card border-border shadow-elegant">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {post.title}
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>{post.pdfs.title}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleCopyPost(post.content)}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Kopyala
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="prose prose-sm max-w-none text-foreground">
                    <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border">
                      {post.content}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Post #{post.post_order}</span>
                      <span className="text-accent">AI Generated</span>
                    </div>
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