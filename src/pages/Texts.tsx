import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar, Eye, User, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Text {
  id: string;
  title: string;
  file_name: string;
  upload_date: string;
  processed: boolean;
  file_size: number;
  is_public: boolean;
  author_name?: string;
  description?: string;
  view_count: number;
  cover_image_url?: string;
  user_id: string;
  posts?: { id: string }[];
}

export default function Texts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTexts, setMyTexts] = useState<Text[]>([]);
  const [publicTexts, setPublicTexts] = useState<Text[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-texts');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTexts();
  }, [user, navigate]);

  const fetchTexts = async () => {
    try {
      // Fetch user's own texts
      const { data: myData, error: myError } = await supabase
        .from('pdfs')
        .select(`
          *,
          posts(id)
        `)
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false });

      if (myError) throw myError;
      setMyTexts(myData || []);

      // Fetch public texts from all users
      const { data: publicData, error: publicError } = await supabase
        .from('pdfs')
        .select(`
          *,
          posts(id)
        `)
        .eq('is_public', true)
        .order('view_count', { ascending: false });

      if (publicError) throw publicError;
      setPublicTexts(publicData || []);
    } catch (error: any) {
      console.error('Error fetching texts:', error);
      toast.error('Metinler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const viewTextCards = async (textId: string, textTitle: string) => {
    // Increment view count for public texts
    const text = [...myTexts, ...publicTexts].find(t => t.id === textId);
    if (text?.is_public && text.user_id !== user?.id) {
      await supabase
        .from('pdfs')
        .update({ view_count: text.view_count + 1 })
        .eq('id', textId);
    }
    navigate(`/timeline?pdf=${textId}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const renderTextCard = (text: Text, isPublic = false) => (
    <div 
      key={text.id} 
      className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group max-w-2xl mx-auto"
      onClick={() => viewTextCards(text.id, text.title)}
    >
      {/* User Info Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">
            {isPublic ? "Topluluk üyesi" : "Sen"}
          </p>
        </div>
        {/* Status Badge */}
        <div className="ml-auto">
          <Badge variant={text.is_public ? "default" : "secondary"} className="text-xs">
            {text.is_public ? (
              <><Globe className="h-3 w-3 mr-1" /> Public</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Private</>
            )}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex space-x-4">
        {/* Book Cover */}
        <div className="flex-shrink-0">
          {text.cover_image_url ? (
            <img 
              src={text.cover_image_url} 
              alt={text.title}
              className="w-20 h-28 object-cover rounded-md shadow-sm"
            />
          ) : (
            <div className="w-20 h-28 bg-gradient-to-br from-primary/20 to-primary/10 rounded-md shadow-sm border border-primary/20 flex items-center justify-center p-2">
              <div className="text-center">
                <FileText className="h-4 w-4 text-primary mb-1 mx-auto" />
                <p className="text-xs font-medium text-primary leading-tight line-clamp-3">
                  {text.title}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-2">
            {text.title}
          </h3>
          
          {text.author_name && (
            <p className="text-sm text-muted-foreground mb-2">
              Yazar: {text.author_name}
            </p>
          )}
          
          {text.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3 leading-relaxed">
              {text.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {text.posts && text.posts.length > 0 && (
              <span className="flex items-center space-x-1">
                <span className="font-medium">{text.posts.length}</span>
                <span>kart</span>
              </span>
            )}
            {text.view_count > 0 && (
              <span className="flex items-center space-x-1">
                <span className="font-medium">{text.view_count}</span>
                <span>okuma</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {!text.processed && (
        <div className="mt-4 pt-4 border-t border-border">
          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            İşleniyor...
          </Badge>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-muted-foreground">Yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Metinler</h1>
          <p className="text-muted-foreground">
            Yüklediğiniz metinler ve topluluktan paylaşılan içerikler
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="my-texts">Yüklediğim Metinler</TabsTrigger>
            <TabsTrigger value="all-texts">Tüm Metinler</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-texts">
            {myTexts.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Henüz metin yüklenmemiş
                </h2>
                <p className="text-muted-foreground mb-6">
                  İlk metninizi yükleyerek okuma kartları oluşturmaya başlayın
                </p>
                <Button onClick={() => navigate('/upload')} className="bg-primary hover:bg-primary/90">
                  Metin Yükle
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myTexts.map((text) => renderTextCard(text, false))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all-texts">
            {publicTexts.length === 0 ? (
              <div className="text-center py-16">
                <Globe className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Henüz paylaşılan metin yok
                </h2>
                <p className="text-muted-foreground">
                  Topluluk üyeleri henüz hiçbir metin paylaşmamış
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {publicTexts.map((text) => renderTextCard(text, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}