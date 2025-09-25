import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserTypeLabel } from '@/utils/userType';
import { Camera, User, Settings, Bell, Shield, CreditCard, Save, Loader2, Link as LinkIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { ImageOptimizationStats } from '@/components/ui/image-optimization-stats';
const LocationPicker = lazy(() => import('@/components/LocationPicker'));

const ProfilePage = () => {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { optimizeSingleImage, isOptimizing, optimizationStats } = useImageOptimization();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [mpData, setMpData] = useState({ mp_cbu_alias: '', mp_full_name: '' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        website: user.website || '',
        bio: user.bio || '',
        avatarKey: user.avatarKey || '',
        location: user.location || null,
        searchRadius: user.searchRadius || 10,
      });
      setMpData({
        mp_cbu_alias: user.mp_cbu_alias || '',
        mp_full_name: user.mp_full_name || '',
      });
      setLoading(false);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (newLocation, newRadius) => {
    setFormData(prev => ({ 
      ...prev, 
      location: newLocation,
      searchRadius: newRadius || prev.searchRadius
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSaving(true);
    
    try {
      // Optimizar la imagen antes de subir
      const optimizedImage = await optimizeSingleImage(file);
      
      const fileName = `${user.id}-${Date.now()}.webp`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, optimizedImage);

      if (uploadError) {
        toast({ title: 'Error de subida', description: `No se pudo subir la imagen. ${uploadError.message}`, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      await updateProfile({ avatarKey: filePath });
      toast({ title: 'Avatar actualizado', description: 'Tu foto de perfil ha sido cambiada.' });
      
      // Mostrar estadísticas de optimización
      if (optimizationStats && optimizationStats.reduction > 0) {
        toast({ 
          title: 'Imagen optimizada', 
          description: `Tamaño reducido en ${optimizationStats.reduction}%` 
        });
      }
    } catch (error) {
      console.error('Error optimizando avatar:', error);
      toast({ title: 'Error', description: 'Error al procesar la imagen.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile(formData);
    setIsSaving(false);
    toast({ title: 'Perfil actualizado', description: 'Tu información ha sido guardada.' });
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if(passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return;
    }
    if(passwordData.newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
    if (error) {
      toast({ title: 'Error', description: `No se pudo cambiar la contraseña: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña ha sido cambiada exitosamente.' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }
    setIsSaving(false);
  }

  const handleConnectMercadoPago = async (e) => {
    e.preventDefault();
    if (!mpData.mp_cbu_alias || !mpData.mp_full_name) {
        toast({ title: "Datos requeridos", description: "Por favor, completa todos los campos.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    await updateProfile(mpData);
    setIsSaving(false);
    toast({ title: "¡Cuenta conectada!", description: "Tus datos de Mercado Pago han sido guardados." });
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  const avatarUrl = user.avatarKey ? supabase.storage.from('portfolio').getPublicUrl(user.avatarKey).data.publicUrl : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Información Básica</CardTitle><CardDescription>Actualiza tu información de contacto.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} /></div>
                  <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} disabled /></div>
                  <div className="space-y-1"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} /></div>
                  <div className="space-y-1"><Label htmlFor="address">Dirección</Label><Input id="address" name="address" value={formData.address} onChange={handleInputChange} /></div>
                  <div className="space-y-1"><Label htmlFor="website">Sitio Web</Label><Input id="website" name="website" value={formData.website} onChange={handleInputChange} /></div>
                </div>
                <div className="space-y-1"><Label htmlFor="bio">Biografía</Label><Textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Cuéntanos un poco sobre ti..." /></div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <p className="text-sm text-muted-foreground">Esta ubicación se usará para que te encuentren en búsquedas locales.</p>
                  <Suspense fallback={<div>Cargando mapa...</div>}>
                    <LocationPicker 
                        value={formData.location} 
                        onChange={handleLocationChange}
                        radius={formData.searchRadius}
                        showRadius={true}
                     />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        );
      case 'settings':
        return (
          <Card>
            <CardHeader><CardTitle>Configuración</CardTitle><CardDescription>Administra las preferencias de tu cuenta.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between"><Label htmlFor="dark-mode">Tema Oscuro</Label><Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} /></div>
              <div className="space-y-2"><Label>Idioma</Label><Select defaultValue="es"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="es">Español</SelectItem><SelectItem value="en" disabled>English (Próximamente)</SelectItem></SelectContent></Select></div>
            </CardContent>
          </Card>
        );
      case 'notifications':
        return (
          <Card>
            <CardHeader><CardTitle>Notificaciones</CardTitle><CardDescription>Elige cómo quieres ser notificado.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label>Nuevos mensajes</Label><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><Label>Actualizaciones de contratos</Label><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><Label>Novedades de la plataforma</Label><Switch /></div>
            </CardContent>
          </Card>
        );
      case 'security':
        return (
          <form onSubmit={handleChangePassword}>
            <Card>
              <CardHeader><CardTitle>Seguridad</CardTitle><CardDescription>Gestiona la seguridad de tu cuenta.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))}/>
                </div>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>
          </form>
        );
      case 'payments':
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pagos</CardTitle>
                    <CardDescription>Conecta tu cuenta de Mercado Pago para retirar tus ganancias.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {user.mp_cbu_alias ? (
                        <div className="p-4 rounded-md bg-green-50 border border-green-200 flex items-center gap-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-800">Tu cuenta de Mercado Pago está conectada.</p>
                                <p className="text-sm text-green-700">Alias/CVU: {user.mp_cbu_alias}</p>
                            </div>
                        </div>
                    ) : null}
                    <form onSubmit={handleConnectMercadoPago} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="mp_cbu_alias">CBU / CVU / Alias</Label>
                            <Input id="mp_cbu_alias" type="text" value={mpData.mp_cbu_alias} onChange={(e) => setMpData(p => ({...p, mp_cbu_alias: e.target.value}))} placeholder="Tu CBU, CVU o alias de Mercado Pago"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mp_full_name">Nombre completo del titular</Label>
                            <Input id="mp_full_name" type="text" value={mpData.mp_full_name} onChange={(e) => setMpData(p => ({...p, mp_full_name: e.target.value}))} placeholder="Tal como figura en la cuenta"/>
                        </div>
                        <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="p-3 flex items-start gap-3">
                                <AlertCircle className="w-10 h-10 text-yellow-600 mt-1"/>
                                <div>
                                    <p className="font-semibold text-yellow-800 text-sm">Importante</p>
                                    <p className="text-xs text-yellow-700">Asegúrate de que los datos sean correctos para poder recibir tus pagos. Esta información es confidencial.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                            {user.mp_cbu_alias ? 'Actualizar Datos' : 'Guardar Datos'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
      default:
        return null;
    }
  };

  const TABS = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'settings', label: 'Configuración', icon: Settings },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'payments', label: 'Pagos', icon: CreditCard },
  ];

  return (
    <>
      <Helmet><title>Mi Perfil - Taskora</title></Helmet>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="p-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-secondary text-secondary-foreground rounded-full p-2 cursor-pointer hover:bg-accent">
                    <Camera className="w-4 h-4" />
                  </Label>
                  <Input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={isOptimizing}
                  />
                  
                  {/* Mostrar estado de carga */}
                  {isOptimizing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                {/* Mostrar estadísticas de optimización */}
                {optimizationStats && (
                  <div className="w-full">
                    <ImageOptimizationStats stats={optimizationStats} showDetails={false} />
                  </div>
                )}
                <h2 className="text-xl font-bold text-center">{user.name}</h2>
                <Badge variant="outline">{getUserTypeLabel(user.userType)}</Badge>
              </div>
              <nav className="mt-6 space-y-1">
                {TABS.map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab(tab.id);
                      navigate(`/profile?tab=${tab.id}`);
                    }}
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </nav>
            </Card>
          </div>
          <div className="md:col-span-3">
            {renderTabContent()}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;