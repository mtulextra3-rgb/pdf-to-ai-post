import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Clock, LogOut, Upload, FolderOpen, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export const Navigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Çıkış yapılamadı: ' + error.message);
    } else {
      toast.success('Başarıyla çıkış yapıldı');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!user) return null;

  return (
    <nav className="bg-gradient-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                PDF to AI Posts
              </span>
            </Link>
            
            <div className="flex space-x-4">
              <Link to="/upload">
                <Button 
                  variant={location.pathname === '/upload' ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Button>
              </Link>
              
              <Link to="/pdfs">
                <Button 
                  variant={location.pathname === '/pdfs' ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>PDF'ler</span>
                </Button>
              </Link>
              
              <Link to="/timeline">
                <Button 
                  variant={location.pathname === '/timeline' ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Timeline</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={toggleTheme} variant="ghost" size="sm">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};