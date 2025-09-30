import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const CommunityTab = () => {
  const { toast } = useToast();
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    type: 'article'
  });

  const loadBlogPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading blog posts:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los artículos del blog.",
          variant: "destructive"
        });
        return;
      }

      setBlogPosts(data || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los artículos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBlogPosts();
  }, [loadBlogPosts]);

  const handleCreatePost = async () => {
    try {
      const newPost = {
        ...formData,
        date: new Date().toISOString(),
        author: 'Admin Taskora',
        description: formData.excerpt
      };

      const { data, error } = await supabase
        .from('blog_posts')
        .insert([newPost])
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        toast({
          title: "Error",
          description: "No se pudo crear el artículo.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "¡Éxito!",
        description: "Artículo creado correctamente."
      });

      setFormData({
        title: '',
        content: '',
        excerpt: '',
        imageUrl: '',
        type: 'article'
      });
      setIsCreateOpen(false);
      loadBlogPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Error inesperado al crear el artículo.",
        variant: "destructive"
      });
    }
  };

  const handleEditPost = async () => {
    if (!editingPost) return;

    try {
      const updateData = {
        ...formData,
        description: formData.excerpt,
        image: formData.imageUrl
      };
      
      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', editingPost.id);

      if (error) {
        console.error('Error updating post:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el artículo.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "¡Éxito!",
        description: "Artículo actualizado correctamente."
      });

      setEditingPost(null);
      setIsEditOpen(false);
      loadBlogPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Error inesperado al actualizar el artículo.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el artículo.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "¡Éxito!",
        description: "Artículo eliminado correctamente."
      });

      loadBlogPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Error inesperado al eliminar el artículo.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      excerpt: post.description || '',
      imageUrl: post.image || '',
      type: post.type || 'article'
    });
    setIsEditOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Comunidad</h2>
          <p className="text-muted-foreground">Administra artículos del blog y contenido comunitario</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Artículo</DialogTitle>
              <DialogDescription>
                Crea un nuevo artículo para el blog de la comunidad
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del artículo"
                />
              </div>
              <div>
                <Label htmlFor="excerpt">Resumen</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Breve descripción del artículo"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="content">Contenido</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Contenido completo del artículo"
                  rows={8}
                />
              </div>
              <div>
                <Label htmlFor="imageUrl">URL de Imagen</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePost}>
                Crear Artículo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blog Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Artículos del Blog</CardTitle>
          <CardDescription>
            {blogPosts.length} artículos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blogPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay artículos del blog aún.</p>
              <p className="text-sm text-muted-foreground mt-2">Crea el primer artículo para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blogPosts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{post.title}</h3>
                        <Badge variant="default">Publicado</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{post.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {post.author}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(post)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Artículo</DialogTitle>
            <DialogDescription>
              Modifica el artículo seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título del artículo"
              />
            </div>
            <div>
              <Label htmlFor="edit-excerpt">Resumen</Label>
              <Textarea
                id="edit-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Breve descripción del artículo"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Contenido</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Contenido completo del artículo"
                rows={8}
              />
            </div>
            <div>
              <Label htmlFor="edit-imageUrl">URL de Imagen</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPost}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityTab;
