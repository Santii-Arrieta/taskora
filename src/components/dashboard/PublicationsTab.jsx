import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Eye, Users, Briefcase, Edit, Trash2, ImagePlus, Globe, MapPin, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/customSupabaseClient';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { ImageOptimizationStats } from '@/components/ui/image-optimization-stats';

const LocationPicker = lazy(() => import('@/components/LocationPicker'));

const MAX_BRIEFS = 10;
const initialBriefState = {
  title: '', description: '', category: '', price: '0', deliveryTime: '', 
  images: [], serviceType: 'online', location: null, radius: 20,
  priceType: 'total'
};

const ApplicantsView = ({ applicants, briefTitle }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-1 space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Postulantes para "{briefTitle}"</CardTitle>
        <CardDescription>Revisa los proveedores que se postularon.</CardDescription>
      </CardHeader>
      <CardContent>
        {applicants.length > 0 ? (
          applicants.map(applicant => (
            <div key={applicant.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <Avatar><AvatarFallback className="provider-gradient">{applicant.name.charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium">{applicant.name}</p>
                  <p className="text-xs text-muted-foreground">Postuló: {new Date(applicant.date).toLocaleDateString()}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to={`/user/${applicant.id}`}>Ver Perfil</Link>
              </Button>
            </div>
          ))
        ) : <p className="text-sm text-muted-foreground text-center py-4">Aún no hay postulantes.</p>}
      </CardContent>
    </Card>
  </motion.div>
);

const PublicationsTab = ({ briefs, setBriefs }) => {
  const { user } = useAuth();
  const { addData, updateData, deleteData } = useData();
  const { toast } = useToast();
  const { optimizeMultipleImages, isOptimizing, optimizationStats } = useImageOptimization();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBrief, setEditingBrief] = useState(null);
  const [newBrief, setNewBrief] = useState({
    ...initialBriefState,
    type: user?.userType === 'ngo' ? 'opportunity' : 'service'
  });
  const [selectedBriefApplicants, setSelectedBriefApplicants] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catQuery, setCatQuery] = useState('');
  
  const canPublish = user?.userType === 'provider' || user?.userType === 'ngo';
  const isVerified = user?.verified;
  const canCreateBrief = isVerified && briefs.length < MAX_BRIEFS && canPublish;

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from('categories').select('id,name,slug').order('name', { ascending: true });
      if (!error && data) setCategories(data);
    };
    loadCategories();
  }, []);

  const filteredCategories = categories
    .filter(c => c.name.toLowerCase().includes(catQuery.toLowerCase()));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (newBrief.images.length + files.length > 5) {
      toast({ title: 'Límite de imágenes', description: 'Puedes subir un máximo de 5 imágenes.', variant: 'destructive' });
      return;
    }
    
    try {
      // Optimizar imágenes antes de subir
      const optimizedImages = await optimizeMultipleImages(files);
      
      const uploadedImages = [];
      for (let i = 0; i < optimizedImages.length; i++) {
        const optimizedImage = optimizedImages[i];
        const originalFile = files[i];
        
        // Usar WebP como extensión
        const fileName = `${user.id}-${Date.now()}-${i}.webp`;
        const filePath = `briefs/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, optimizedImage);

        if (uploadError) {
          toast({ title: 'Error de subida', description: `No se pudo subir la imagen ${originalFile.name}.`, variant: 'destructive' });
          continue;
        }

        const { data } = supabase.storage.from('portfolio').getPublicUrl(filePath);
        uploadedImages.push(data.publicUrl);
      }
      
      setNewBrief(prev => ({...prev, images: [...prev.images, ...uploadedImages]}));
      
      // Mostrar estadísticas de optimización
      if (optimizationStats && optimizationStats.reduction > 0) {
        toast({ 
          title: 'Imágenes optimizadas', 
          description: `Tamaño reducido en ${optimizationStats.reduction}%` 
        });
      }
    } catch (error) {
      console.error('Error optimizando imágenes:', error);
      toast({ title: 'Error', description: 'Error al procesar las imágenes.', variant: 'destructive' });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (editingBrief) {
      await handleUpdateBrief();
    } else {
      await handleCreateBrief();
    }
  };

  const handleCreateBrief = async () => {
    if (!canCreateBrief) {
      if (!canPublish) toast({ title: "Acción no permitida", description: "Solo los proveedores y ONGs pueden publicar.", variant: "destructive" });
      else if (!isVerified) toast({ title: "Verificación requerida", description: "Necesitas estar verificado para publicar.", variant: "destructive" });
      else toast({ title: "Límite alcanzado", description: `Has alcanzado el límite de ${MAX_BRIEFS} publicaciones.`, variant: "destructive" });
      return;
    }

    const briefData = { ...newBrief, userId: user.id, createdAt: new Date().toISOString(), status: 'active', views: 0, applications: [] };

    const newBriefData = await addData('briefs', briefData);
    if(newBriefData) {
      setBriefs(prev => [...prev, newBriefData]);
      resetForm();
      toast({ title: "¡Publicación creada!", description: "Tu publicación ha sido creada exitosamente." });
    } else {
      toast({ title: "Error", description: "No se pudo crear la publicación.", variant: "destructive" });
    }
  };

  const handleEditBrief = (brief) => {
    setEditingBrief(brief);
    setNewBrief({
      title: brief.title,
      description: brief.description,
      category: brief.category,
      price: brief.price,
      deliveryTime: brief.deliveryTime,
      type: brief.type,
      images: brief.images || [],
      serviceType: brief.serviceType || 'online',
      location: brief.location || null,
      radius: brief.radius || 20,
      priceType: brief.priceType || 'total',
    });
    setShowCreateForm(true);
    window.scrollTo(0, 0);
  };

  const handleUpdateBrief = async () => {
    const updatedBrief = await updateData('briefs', editingBrief.id, newBrief);
    if (updatedBrief) {
      setBriefs(prev => prev.map(b => b.id === editingBrief.id ? updatedBrief : b));
      resetForm();
      toast({ title: "Publicación actualizada", description: "Tus cambios han sido guardados." });
    } else {
      toast({ title: "Error", description: "No se pudo actualizar la publicación.", variant: "destructive" });
    }
  };

  const handleDeleteBrief = async (briefId) => {
    await deleteData('briefs', briefId);
    setBriefs(prev => prev.filter(b => b.id !== briefId));
    toast({ title: "Publicación eliminada", description: "La publicación ha sido eliminada." });
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingBrief(null);
    setNewBrief({ ...initialBriefState, type: user?.userType === 'ngo' ? 'opportunity' : 'service' });
  };

  if (!canPublish) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Sección no disponible</h3>
          <p className="text-gray-600">Como cliente, no tienes acceso a esta sección de publicaciones.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className={`lg:col-span-${selectedBriefApplicants ? 2 : 3}`}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{user.userType === 'ngo' ? 'Mis Oportunidades' : 'Mis Servicios'}</h2>
            <Button onClick={() => setShowCreateForm(true)} disabled={!canCreateBrief}><Plus className="w-4 h-4 mr-2" />Crear Publicación</Button>
          </div>
          {showCreateForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6"><Card><CardHeader><CardTitle>{editingBrief ? 'Editar Publicación' : 'Nueva Publicación'}</CardTitle></CardHeader><CardContent><form onSubmit={handleFormSubmit} className="space-y-4">
              <Input placeholder="Título" value={newBrief.title} onChange={(e) => setNewBrief({...newBrief, title: e.target.value})} required />
              <Textarea placeholder="Descripción detallada del servicio/oportunidad" value={newBrief.description} onChange={(e) => setNewBrief({...newBrief, description: e.target.value})} required rows={5}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={newBrief.category_id || ''}
                  onValueChange={(v) => {
                    const selected = categories.find(c => c.id === v);
                    setNewBrief(prev => ({ ...prev, category_id: v, category: selected?.slug || prev.category }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input placeholder="Buscar categoría..." value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
                    </div>
                    {filteredCategories.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                    ) : filteredCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Duración/Entrega (días)" type="number" value={newBrief.deliveryTime} onChange={(e) => setNewBrief({...newBrief, deliveryTime: e.target.value})} required />
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="number"
                  placeholder={user.userType === 'ngo' ? 'Compensación (Voluntario = 0)' : 'Precio ($)'}
                  value={newBrief.price}
                  onChange={(e) => setNewBrief({...newBrief, price: e.target.value})}
                  required
                  className="pl-8"
                  title="Importe"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de precio</Label>
                <Select value={newBrief.priceType} onValueChange={(v) => setNewBrief({...newBrief, priceType: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el tipo de precio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Pago único / Total</SelectItem>
                    <SelectItem value="por_hora">Por hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <Select value={newBrief.serviceType} onValueChange={(v) => setNewBrief({...newBrief, serviceType: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el tipo de servicio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online"><Globe className="w-4 h-4 mr-2 inline-block" />Online</SelectItem>
                    <SelectItem value="presencial"><MapPin className="w-4 h-4 mr-2 inline-block" />Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newBrief.serviceType === 'presencial' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4 border rounded-md">
                  <Label>Ubicación y Radio de Servicio</Label>
                  <Suspense fallback={<div>Cargando mapa...</div>}>
                    <LocationPicker value={newBrief.location} onChange={(location) => setNewBrief(prev => ({ ...prev, location }))} radius={newBrief.radius}/>
                  </Suspense>
                  <div className="space-y-2">
                    <Label>Radio de Cobertura: {newBrief.radius} km</Label>
                    <Slider min={1} max={200} step={1} value={[newBrief.radius]} onValueChange={(value) => setNewBrief(prev => ({ ...prev, radius: value[0] }))}/>
                  </div>
                </motion.div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Imágenes (hasta 5)</Label>
                <div className="flex items-center gap-2">
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="p-2 border rounded-md hover:bg-gray-50">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    </Label>
                    <Input 
                      id="image-upload" 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                      disabled={newBrief.images.length >= 5 || isOptimizing}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {newBrief.images.map((img, i) => (
                        <img key={i} src={img} className="w-16 h-16 rounded-md object-cover" alt="preview"/>
                      ))}
                    </div>
                </div>
                
                {/* Mostrar estadísticas de optimización */}
                {optimizationStats && (
                  <div className="mt-3">
                    <ImageOptimizationStats stats={optimizationStats} showDetails={false} />
                  </div>
                )}
                
                {/* Mostrar estado de carga */}
                {isOptimizing && (
                  <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Optimizando imágenes...
                  </div>
                )}
              </div>

              <div className="flex gap-2"><Button type="submit">{editingBrief ? 'Guardar Cambios' : 'Publicar'}</Button><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button></div>
            </form></CardContent></Card></motion.div>
          )}
          <div className="space-y-4">
            {briefs.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900">No tienes publicaciones</h3><p className="text-gray-600 mb-4">Crea tu primera publicación para empezar.</p><Button onClick={() => setShowCreateForm(true)} disabled={!canCreateBrief}><Plus className="w-4 h-4 mr-2" />Crear</Button></CardContent></Card>
            ) : (
              briefs.map((brief) => (
                <Card key={brief.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                       <Link to={`/brief/${brief.id}`} className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">{brief.title}</CardTitle>
                      </Link>
                      <Badge className={`ml-4 ${brief.type === 'opportunity' ? 'ngo-gradient' : 'provider-gradient'} text-white`}>{brief.type === 'opportunity' ? 'Oportunidad' : 'Servicio'}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center"><strong>Precio:</strong>&nbsp;${brief.price}<span className="ml-1 text-green-600 font-semibold">{(brief.priceType || 'total') === 'por_hora' ? '/hora' : '/unico'}</span></span>
                      <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{brief.views || 0}</span>
                      <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{brief.applications?.length || 0}</span>
                      <span className="flex items-center">
                        {brief.serviceType === 'presencial' ? <MapPin className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                        {brief.serviceType === 'presencial' ? 'Presencial' : 'Online'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    {user.userType === 'ngo' && <Button onClick={() => setSelectedBriefApplicants(selectedBriefApplicants?.briefTitle === brief.title ? null : {applicants: brief.applications, briefTitle: brief.title})}>Ver Postulantes ({brief.applications?.length || 0})</Button>}
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="icon" onClick={() => handleEditBrief(brief)}><Edit className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente tu publicación.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBrief(brief.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </motion.div>
      </div>
      {selectedBriefApplicants && <ApplicantsView {...selectedBriefApplicants} />}
    </div>
  );
};

export default PublicationsTab;