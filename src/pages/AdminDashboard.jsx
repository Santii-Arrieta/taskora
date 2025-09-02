import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, FileText, BarChart2, AlertTriangle, Briefcase, MessageCircle, Sun, Moon, Settings, Rss, UserPlus, LifeBuoy, Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import VerificationsTab from '@/components/admin/VerificationsTab';
import UsersTab from '@/components/admin/UsersTab';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import SettingsTab from '@/components/admin/SettingsTab';
import BlogManagementTab from '@/components/admin/BlogManagementTab';
import AdminsTab from '@/components/admin/AdminsTab';
import SupportTab from '@/components/admin/SupportTab';
import NewsletterTab from '@/components/admin/NewsletterTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/customSupabaseClient';
import ContentTab from '@/components/admin/ContentTab';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('verifications');
  const [data, setData] = useState({
    allUsers: [],
    allBriefs: [],
    allConversations: [],
    supportTickets: [],
    newsletterSubscribers: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        { data: usersData, error: usersError },
        { data: briefsData, error: briefsError },
        { data: convosData, error: convosError },
        { data: ticketsData, error: ticketsError },
        { data: subscribersData, error: subscribersError },
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('briefs').select('*, author:userId(name)'),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
      ]);

      if (usersError || briefsError || convosError || ticketsError || subscribersError) {
        throw new Error(usersError?.message || briefsError?.message || convosError?.message || ticketsError?.message || subscribersError?.message);
      }

      const enrichedUsers = usersData.map(u => ({
        ...u,
        avatarUrl: u.avatarKey ? supabase.storage.from('avatars').getPublicUrl(u.avatarKey).data.publicUrl : null
      }));
      const enrichedBriefs = briefsData.map(b => ({ ...b, userName: b.author?.name || 'N/A' }));

      setData({
        allUsers: enrichedUsers,
        allBriefs: enrichedBriefs,
        allConversations: convosData || [],
        supportTickets: ticketsData,
        newsletterSubscribers: subscribersData,
      });

    } catch (error) {
      console.error("Failed to load data from Supabase", error);
      toast({
        title: "Error de carga",
        description: `No se pudieron cargar los datos: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.userType === 'admin') {
      loadData();
    } else if (user && user.userType !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate, loadData]);

  const handleVerifyUser = async (userId, userType) => {
    const { error } = await supabase.rpc('approve_verification', { p_user_id: userId, p_user_type: userType });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo verificar al usuario.', variant: 'destructive' });
      return;
    }
    setData(prev => ({...prev, allUsers: prev.allUsers.map(u => u.id === userId ? {...u, verified: true, verificationStatus: 'verified'} : u)}));
    toast({ title: "Usuario verificado", description: "El usuario ha sido verificado exitosamente." });
  };

  const handleRejectUser = async (userId) => {
    const { error } = await supabase.rpc('reject_verification', { p_user_id: userId });
    if (error) {
      toast({ title: "Error", description: "No se pudo rechazar la verificación.", variant: 'destructive' });
      return;
    }
    setData(prev => ({...prev, allUsers: prev.allUsers.map(u => u.id === userId ? {...u, verificationStatus: 'rejected', verificationDocs: []} : u)}));
    toast({ title: "Verificación rechazada", description: "La solicitud de verificación ha sido rechazada.", variant: "destructive" });
  };
  
  const setAllUsers = (newUsers) => {
    setData(prev => ({ ...prev, allUsers: newUsers }));
  }

  const pendingUsers = useMemo(() => data.allUsers.filter(u => u.verificationStatus === 'pending'), [data.allUsers]);

  const stats = useMemo(() => ({
    totalUsers: data.allUsers.length,
    totalProviders: data.allUsers.filter(u => u.userType === 'provider').length,
    totalClients: data.allUsers.filter(u => u.userType === 'client').length,
    totalNGOs: data.allUsers.filter(u => u.userType === 'ngo').length,
    verifiedProviders: data.allUsers.filter(u => u.userType === 'provider' && u.verified).length,
    pendingVerifications: pendingUsers.length,
    totalBriefs: data.allBriefs.length,
    totalConversations: data.allConversations.length,
    openSupportTickets: data.supportTickets.filter(t => t.status === 'open').length,
    newsletterSubscribers: data.newsletterSubscribers.length,
  }), [data, pendingUsers.length]);

  if (!user || user.userType !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
   const AdminStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Usuarios</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pendientes</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{stats.pendingVerifications}</div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tickets Soporte</CardTitle><LifeBuoy className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-500">{stats.openSupportTickets}</div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Publicaciones</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalBriefs}</div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Newsletter</CardTitle><Newspaper className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.newsletterSubscribers}</div></CardContent></Card>
    </div>
  );

  const TABS_CONFIG = [
    { value: "verifications", label: "Verificaciones", icon: FileText },
    { value: "users", label: "Usuarios", icon: Users },
    { value: "admins", label: "Admins", icon: UserPlus },
    { value: "content", label: "Contenido", icon: Briefcase },
    { value: "blog", label: "Comunidad", icon: Rss },
    { value: "support", label: "Soporte", icon: LifeBuoy },
    { value: "newsletter", label: "Newsletter", icon: Newspaper },
    { value: "analytics", label: "Analíticas", icon: BarChart2 },
    { value: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      <Helmet><title>Panel de Administración - Taskora</title></Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div><h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1><p className="text-muted-foreground mt-1">Bienvenido, {user.name}.</p></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2"><Sun className="h-5 w-5" /><Switch id="theme-switch-admin" checked={theme === 'dark'} onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')} /><Moon className="h-5 w-5" /></div>
              <Badge className="bg-purple-600 text-white"><Shield className="w-4 h-4 mr-2" />Administrador</Badge>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><AdminStats /></motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TABS_CONFIG.length}, minmax(0, 1fr))` }}>
                  {TABS_CONFIG.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}><tab.icon className="w-4 h-4 mr-2" />{tab.label}</TabsTrigger>
                  ))}
                </TabsList>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <TabsContent value="verifications" className="m-0"><VerificationsTab pendingUsers={pendingUsers} onVerifyUser={handleVerifyUser} onRejectUser={handleRejectUser} /></TabsContent>
                    <TabsContent value="users" className="m-0"><UsersTab users={data.allUsers} stats={stats} setAllUsers={setAllUsers} /></TabsContent>
                    <TabsContent value="admins" className="m-0"><AdminsTab allUsers={data.allUsers} setAllUsers={setAllUsers} /></TabsContent>
                    <TabsContent value="content" className="m-0"><ContentTab briefs={data.allBriefs} /></TabsContent>
                    <TabsContent value="blog" className="m-0"><BlogManagementTab /></TabsContent>
                    <TabsContent value="support" className="m-0"><SupportTab tickets={data.supportTickets} setData={setData} /></TabsContent>
                    <TabsContent value="newsletter" className="m-0"><NewsletterTab subscribers={data.newsletterSubscribers} /></TabsContent>
                    <TabsContent value="analytics" className="m-0"><AnalyticsTab stats={stats} /></TabsContent>
                    <TabsContent value="settings" className="m-0"><SettingsTab /></TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;