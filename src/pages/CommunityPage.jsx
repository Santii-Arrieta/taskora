
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Rss, Users, MessageSquare, PlusCircle, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CommunityPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState({ title: '', description: '', category: '' });

  const fetchBlogPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las publicaciones del blog.", variant: "destructive" });
    } else {
      setBlogPosts(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  const handleSuggestSubmit = async () => {
    if (!suggestion.title || !suggestion.category) {
      toast({ title: "Campos requeridos", description: "Por favor, completa el título y la categoría.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from('topic_suggestions').insert({
      ...suggestion,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar tu sugerencia.", variant: "destructive" });
    } else {
      toast({ title: "¡Gracias!", description: "Tu sugerencia ha sido enviada para su revisión." });
      setIsSuggestOpen(false);
      setSuggestion({ title: '', description: '', category: '' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Comunidad - Taskora</title>
        <meta name="description" content="Únete a la comunidad de Taskora. Lee nuestro blog, participa en discusiones y conecta con otros profesionales." />
      </Helmet>
      <Navbar />
      <div className="bg-background">
        <header className="bg-primary text-primary-foreground py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center justify-center">
              <Users className="w-12 h-12 mr-4" />
              Nuestra Comunidad
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl mx-auto text-lg">
              Un espacio para aprender, compartir y crecer juntos.
            </motion.p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold flex items-center">
              <Rss className="w-8 h-8 mr-3 text-primary" />
              Blog y Novedades
            </h2>
            {user && (
              <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
                <DialogTrigger asChild>
                  <Button><Lightbulb className="w-4 h-4 mr-2" />Sugerir un Tema</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sugerir un Tema para el Blog</DialogTitle>
                    <DialogDescription>¿Tienes una idea para un artículo? ¡Nos encantaría escucharla!</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sugg-title">Título del Tema</Label>
                      <Input id="sugg-title" value={suggestion.title} onChange={(e) => setSuggestion(prev => ({ ...prev, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sugg-desc">Descripción (Opcional)</Label>
                      <Textarea id="sugg-desc" value={suggestion.description} onChange={(e) => setSuggestion(prev => ({ ...prev, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sugg-cat">Categoría</Label>
                      <Select onValueChange={(value) => setSuggestion(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freelancing">Freelancing</SelectItem>
                          <SelectItem value="desarrollo-profesional">Desarrollo Profesional</SelectItem>
                          <SelectItem value="productividad">Productividad</SelectItem>
                          <SelectItem value="noticias-plataforma">Noticias de la Plataforma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSuggestOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSuggestSubmit}>Enviar Sugerencia</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">Cargando publicaciones...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post, index) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                    <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                    <CardHeader>
                      <CardTitle>{post.title}</CardTitle>
                      <CardDescription>{new Date(post.date).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground line-clamp-3">{post.description}</p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Link to={`/blog/${post.id}`}>
                        <Button className="w-full">Leer Más</Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default CommunityPage;
