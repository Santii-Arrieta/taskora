import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Rss, Edit, Trash2, Calendar, Users, Eye, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { ImageOptimizationStats } from '@/components/ui/image-optimization-stats';

const initialPostState = {
  type: 'article',
  title: '',
  description: '',
  author: 'Equipo Taskora',
  date: new Date().toISOString(),
  image: null,
  content: '',
  registered_users: [],
};

const BlogManagementTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { optimizeSingleImage, isOptimizing, optimizationStats } = useImageOptimization();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAttendeesDialogOpen, setIsAttendeesDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postData, setPostData] = useState(initialPostState);
  const [attendees, setAttendees] = useState([]);
  const imageInputRef = useRef(null);

  const fetchPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('blog_posts').select('*').order('date', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las publicaciones.', variant: 'destructive' });
    } else {
      setPosts(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Optimizar la imagen antes de subir
      const optimizedImage = await optimizeSingleImage(file);
      
      const fileName = `${Math.random()}.webp`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, optimizedImage);

      if (uploadError) {
        toast({ title: 'Error de subida', description: `No se pudo subir la imagen. ${uploadError.message}`, variant: 'destructive' });
        return;
      }

      const { data } = supabase.storage.from('portfolio').getPublicUrl(filePath);
      setPostData(prev => ({ ...prev, image: data.publicUrl }));
      
      // Mostrar estadísticas de optimización
      if (optimizationStats && optimizationStats.reduction > 0) {
        toast({ 
          title: 'Imagen optimizada', 
          description: `Tamaño reducido en ${optimizationStats.reduction}%` 
        });
      }
    } catch (error) {
      console.error('Error optimizando imagen del blog:', error);
      toast({ title: 'Error', description: 'Error al procesar la imagen.', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!postData.title || !postData.content) {
      toast({ title: 'Error', description: 'Título y contenido son requeridos.', variant: 'destructive' });
      return;
    }

    const dataToSave = { ...postData, author: user.name || 'Admin' };

    let error;
    if (editingPost) {
      const { error: updateError } = await supabase.from('blog_posts').update(dataToSave).eq('id', editingPost.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('blog_posts').insert([dataToSave]).select();
      error = insertError;
    }
    
    if (error) {
      console.error("Save error:", error);
      toast({ title: 'Error', description: `No se pudo guardar la publicación. ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: `La publicación ha sido ${editingPost ? 'actualizada' : 'creada'}.` });
      await fetchPosts();
      setIsDialogOpen(false);
      setEditingPost(null);
      setPostData(initialPostState);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setPostData(post);
    setIsDialogOpen(true);
  };

  const handleDelete = async (postId) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
    if (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la publicación.', variant: 'destructive' });
    } else {
        toast({ title: 'Publicación eliminada', description: 'La publicación ha sido eliminada.' });
        setPosts(posts.filter(p => p.id !== postId));
    }
  };
  
  const openNewPostDialog = (type) => {
    setEditingPost(null);
    setPostData({...initialPostState, type: type, date: new Date().toISOString(), author: user.name || 'Admin'});
    setIsDialogOpen(true);
  };
  
  const showAttendees = (post) => {
    setAttendees(post.registered_users || []);
    setIsAttendeesDialogOpen(true);
  };

  const articles = posts.filter(p => p.type !== 'event');
  const events = posts.filter(p => p.type === 'event');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center"><Rss className="w-5 h-5 mr-2" />Gestión de Contenido</CardTitle>
            <div className="flex gap-2">
                <Button onClick={() => openNewPostDialog('article')}><Plus className="w-4 h-4 mr-2" />Nuevo Artículo</Button>
                <Button onClick={() => openNewPostDialog('event')} variant="secondary"><Plus className="w-4 h-4 mr-2" />Nuevo Evento</Button>
            </div>
        </div>
        <CardDescription>Crea y gestiona artículos del blog y eventos para la comunidad.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="text-center py-8">Cargando contenido...</div>
        ) : (
            <Tabs defaultValue="articles">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="articles">Artículos ({articles.length})</TabsTrigger>
                <TabsTrigger value="events">Eventos ({events.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="articles" className="mt-4">
                <div className="space-y-4">
                {articles.length > 0 ? articles.map(post => (
                    <Card key={post.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                        <h4 className="font-semibold">{post.title}</h4>
                        <p className="text-sm text-muted-foreground">{post.author} - {new Date(post.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(post)}><Edit className="w-4 h-4" /></Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Confirmar eliminación</AlertDialogTitle><AlertDialogDescription>¿Estás seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(post.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    </CardContent>
                    </Card>
                )) : (
                    <p className="text-center text-muted-foreground py-8">No hay artículos en el blog.</p>
                )}
                </div>
            </TabsContent>
            <TabsContent value="events" className="mt-4">
                <div className="space-y-4">
                {events.length > 0 ? events.map(post => (
                    <Card key={post.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                        <h4 className="font-semibold">{post.title}</h4>
                        <p className="text-sm text-muted-foreground"><Calendar className="w-3 h-3 inline-block mr-1"/> {new Date(post.date).toLocaleString()} <Users className="w-3 h-3 inline-block ml-3 mr-1"/> {post.registered_users?.length || 0} registrados</p>
                        </div>
                        <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => showAttendees(post)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleEdit(post)}><Edit className="w-4 h-4" /></Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Confirmar eliminación</AlertDialogTitle><AlertDialogDescription>¿Estás seguro que quieres eliminar este evento? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(post.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    </CardContent>
                    </Card>
                )) : (
                    <p className="text-center text-muted-foreground py-8">No hay eventos programados.</p>
                )}
                </div>
            </TabsContent>
            </Tabs>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingPost ? `Editar ${postData.type === 'event' ? 'Evento' : 'Artículo'}` : `Nuevo ${postData.type === 'event' ? 'Evento' : 'Artículo'}`}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <Input placeholder="Título" value={postData.title} onChange={e => setPostData({...postData, title: e.target.value})} />
            <Input placeholder="Descripción corta" value={postData.description} onChange={e => setPostData({...postData, description: e.target.value})} />
            {postData.type === 'event' ? (
                 <div>
                    <Label>Fecha y hora del evento</Label>
                    <Input type="datetime-local" value={postData.date ? new Date(postData.date).toISOString().substring(0, 16) : ''} onChange={e => setPostData({...postData, date: new Date(e.target.value).toISOString()})} />
                 </div>
            ): (
                 <div>
                    <Label>Fecha de Publicación</Label>
                    <Input type="date" value={postData.date ? new Date(postData.date).toISOString().substring(0, 10) : ''} onChange={e => setPostData({...postData, date: new Date(e.target.value).toISOString()})} />
                 </div>
            )}
             <div>
                <Label>Imagen de portada</Label>
                <div className="flex items-center gap-4 mt-2">
                    <img src={postData.image || "https://placehold.co/400x200?text=Sube+una+imagen"} alt="Vista previa" className="w-24 h-24 object-cover rounded-md border" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isOptimizing}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {isOptimizing ? 'Optimizando...' : 'Cambiar Imagen'}
                    </Button>
                    <input 
                      type="file" 
                      ref={imageInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                </div>
                
                {/* Mostrar estadísticas de optimización */}
                {optimizationStats && (
                  <div className="mt-3">
                    <ImageOptimizationStats stats={optimizationStats} showDetails={false} />
                  </div>
                )}
            </div>
            <Textarea placeholder="Contenido (usa ### para títulos)" value={postData.content} onChange={e => setPostData({...postData, content: e.target.value})} rows={10} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAttendeesDialogOpen} onOpenChange={setIsAttendeesDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Asistentes Registrados</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                {attendees.length > 0 ? (
                    <ul className="space-y-2">
                        {attendees.map((attendee, index) => (
                            <li key={index} className="p-2 border rounded-md">
                                <p className="font-semibold">{attendee.name}</p>
                                <p className="text-sm text-muted-foreground">{attendee.email}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground py-4">No hay asistentes registrados.</p>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BlogManagementTab;