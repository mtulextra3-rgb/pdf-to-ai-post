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
    <Card 
      key={text.id} 
      className="bg-card hover:shadow-elegant transition-all duration-300 cursor-pointer group border-border relative overflow-hidden"
      onClick={() => viewTextCards(text.id, text.title)}
    >
      {/* Cover Image or Default Design */}
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        {text.cover_image_url ? (
          <img 
            src={text.cover_image_url} 
            alt={text.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="bg-primary/20 rounded-lg p-6 w-32 h-36 flex items-center justify-center border-2 border-primary/30">
            <div className="text-center">
              <FileText className="h-8 w-8 text-primary mb-2 mx-auto" />
              <h4 className="text-sm font-semibold text-primary line-clamp-3 leading-tight">
                {text.title}
              </h4>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={text.is_public ? "default" : "secondary"} className="text-xs">
            {text.is_public ? (
              <><Globe className="h-3 w-3 mr-1" /> Public</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Private</>
            )}
          </Badge>
        </div>
        
        {/* Processing Status */}
        {!text.processed && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              İşleniyor
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {text.title}
        </CardTitle>
        
        {text.author_name && (
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Yazar: {text.author_name}
          </CardDescription>
        )}
        
        {text.description && (
          <CardDescription className="text-sm line-clamp-2">
            {text.description}
          </CardDescription>
        )}
        
        {isPublic && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Topluluk üyesi</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">
              {formatDate(text.upload_date)}
            </span>
          </div>
          <span className="text-xs">{formatFileSize(text.file_size || 0)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            {text.posts && text.posts.length > 0 && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                {text.posts.length} kart
              </span>
            )}
            {text.view_count > 0 && (
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{text.view_count}</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              viewTextCards(text.id, text.title);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {publicTexts.map((text) => renderTextCard(text, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}