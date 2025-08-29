import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload as UploadIcon, FileText, Eye, Bot, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PDF {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  processed: boolean;
}

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPdfs();
  }, [user, navigate]);

  const fetchPdfs = async () => {
    try {
      const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setPdfs(data || []);
    } catch (error: any) {
      toast.error('PDF\'ler yüklenirken hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast.error('Lütfen sadece PDF dosyası yükleyin');
      return;
    }

    setUploading(true);

    try {
      const fileExt = 'pdf';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('pdfs')
        .insert([{
          user_id: user.id,
          title: file.name.replace('.pdf', ''),
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          processed: false
        }]);

      if (dbError) throw dbError;

      toast.success('PDF başarıyla yüklendi!');
      fetchPdfs();
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      toast.error('Yükleme hatası: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleViewPdf = async (pdf: PDF) => {
    try {
      const { data } = await supabase.storage
        .from('pdfs')
        .createSignedUrl(pdf.file_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast.error('PDF açılamadı: ' + error.message);
    }
  };

  const handleProcessWithAI = async (pdf: PDF) => {
    setProcessing(pdf.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-pdf-to-posts', {
        body: { pdfId: pdf.id }
      });

      if (error) throw error;

      toast.success('PDF başarıyla AI ile işlendi!');
      fetchPdfs();
      navigate('/timeline');
    } catch (error: any) {
      toast.error('AI işleme hatası: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeletePdf = async (pdf: PDF) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([pdf.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('pdfs')
        .delete()
        .eq('id', pdf.id);

      if (dbError) throw dbError;

      toast.success('PDF silindi');
      fetchPdfs();
    } catch (error: any) {
      toast.error('Silme hatası: ' + error.message);
    }
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            PDF Yükle
          </h1>
          <p className="text-muted-foreground mt-2">
            PDF dosyalarınızı yükleyin ve AI ile sosyal medya postlarına dönüştürün
          </p>
        </div>

        {/* Upload Section */}
        <Card className="bg-gradient-card border-border shadow-elegant mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UploadIcon className="h-5 w-5" />
              <span>Yeni PDF Yükle</span>
            </CardTitle>
            <CardDescription>
              PDF dosyanızı seçin ve yükleyin (Maks. 50MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">PDF Dosyası</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-1"
                />
              </div>
              {uploading && (
                <div className="text-sm text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PDF List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Yüklenen PDF'ler</h2>
          
          {loading ? (
            <Card className="bg-gradient-card border-border">
              <CardContent className="py-8 text-center">
                <div className="text-muted-foreground">Yükleniyor...</div>
              </CardContent>
            </Card>
          ) : pdfs.length === 0 ? (
            <Card className="bg-gradient-card border-border">
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground">
                  Henüz PDF yüklenmemiş. İlk PDF'nizi yükleyin!
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pdfs.map((pdf) => (
                <Card key={pdf.id} className="bg-gradient-card border-border shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{pdf.title}</h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>{formatFileSize(pdf.file_size)}</div>
                            <div>{formatDate(pdf.upload_date)}</div>
                            {pdf.processed && (
                              <div className="text-accent font-medium">✓ AI ile işlenmiş</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleViewPdf(pdf)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Görüntüle
                        </Button>
                        
                        <Button
                          onClick={() => handleProcessWithAI(pdf)}
                          variant="accent"
                          size="sm"
                          disabled={processing === pdf.id || pdf.processed}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          {processing === pdf.id 
                            ? 'İşleniyor...' 
                            : pdf.processed 
                              ? 'İşlenmiş' 
                              : 'AI ile Postlara Çevir'
                          }
                        </Button>

                        <Button
                          onClick={() => handleDeletePdf(pdf)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}