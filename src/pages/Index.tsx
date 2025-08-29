import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Bot, Zap, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/upload');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-primary rounded-full shadow-glow">
                <FileText className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-6">
              PDF'den AI Post'a
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              PDF dosyalarınızı yükleyin, yapay zeka ile analiz edin ve 
              sosyal medya için hazır postlara dönüştürün. Hepsi tek tıkla!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/auth')}
                variant="hero" 
                size="lg"
                className="text-lg px-8 py-6"
              >
                Hemen Başla
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6"
              >
                Nasıl Çalışır?
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Neler Yapabilirsiniz?
            </h2>
            <p className="text-muted-foreground text-lg">
              PDF'lerinizi sosyal medya içeriğine dönüştürmenin en kolay yolu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="p-3 bg-gradient-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-glow">
                <FileText className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">PDF Yükle</h3>
              <p className="text-muted-foreground">
                PDF dosyalarınızı güvenli bir şekilde yükleyin ve saklayın
              </p>
            </div>

            <div className="text-center p-6">
              <div className="p-3 bg-gradient-accent rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-accent">
                <Bot className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI İle İşle</h3>
              <p className="text-muted-foreground">
                Yapay zeka ile PDF içeriğinizi analiz edin ve postlara dönüştürün
              </p>
            </div>

            <div className="text-center p-6">
              <div className="p-3 bg-gradient-primary rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-glow">
                <Zap className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Anında Paylaş</h3>
              <p className="text-muted-foreground">
                Hazır postları kopyalayın ve sosyal medyada paylaşın
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
            Hemen Denemeye Başlayın
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            PDF'lerinizi sosyal medya postlarına dönüştürmenin ne kadar kolay olduğunu görün
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            variant="hero" 
            size="lg"
            className="text-lg px-8 py-6"
          >
            Ücretsiz Başla
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
