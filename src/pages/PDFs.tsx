import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PDF {
  id: string;
  title: string;
  file_name: string;
  upload_date: string;
  processed: boolean;
  file_size: number;
  posts?: { id: string }[];
}

export default function PDFs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPDFs();
  }, [user, navigate]);

  const fetchPDFs = async () => {
    try {
      const { data, error } = await supabase
        .from('pdfs')
        .select(`
          *,
          posts(id)
        `)
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setPdfs(data || []);
    } catch (error: any) {
      console.error('Error fetching PDFs:', error);
      toast.error('PDF\'ler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const viewPDFCards = (pdfId: string, pdfTitle: string) => {
    navigate(`/timeline?pdf=${pdfId}`);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">PDF'lerim</h1>
          <p className="text-muted-foreground">
            Yüklediğiniz PDF'ler ve oluşturulan okuma kartları
          </p>
        </div>

        {pdfs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Henüz PDF yüklenmemiş
            </h2>
            <p className="text-muted-foreground mb-6">
              İlk PDF'inizi yükleyerek okuma kartları oluşturmaya başlayın
            </p>
            <Button onClick={() => navigate('/upload')} className="bg-primary hover:bg-primary/90">
              PDF Yükle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pdfs.map((pdf) => (
              <Card 
                key={pdf.id} 
                className="bg-card hover:shadow-elegant transition-all duration-300 cursor-pointer group border-border"
                onClick={() => viewPDFCards(pdf.id, pdf.title)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>{formatFileSize(pdf.file_size || 0)}</span>
                      {pdf.posts && pdf.posts.length > 0 && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full mt-1">
                          {pdf.posts.length} kart
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {pdf.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {pdf.file_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        {formatDate(pdf.upload_date)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      pdf.processed 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {pdf.processed ? 'İşlendi' : 'İşleniyor'}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewPDFCards(pdf.id, pdf.title);
                      }}
                    >
                      <Eye className="h-4 w-4" />
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