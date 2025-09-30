import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, FileText, BarChart2, AlertTriangle, Briefcase, MessageCircle, Sun, Moon, Settings, Rss, UserPlus, LifeBuoy, Newspaper, Loader2 } from 'lucide-react';
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
import { usePagination } from '@/hooks/usePagination';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('verifications');
  const [isLoading, setIsLoading] = useState(true);

  // Paginación para usuarios
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    paginationInfo: usersPagination,
    goToPage: goToUsersPage,
    refresh: refreshUsers
  } = usePagination('users', {
    pageSize: 20,
    orderBy: 'created_at',
    orderDirection: 'desc',
    select: '*',
    dependencies: []
  });

  // Paginación para servicios/briefs
  const {
    data: briefs,
    loading: briefsLoading,
    error: briefsError,
    paginationInfo: briefsPagination,
    goToPage: goToBriefsPage,
    refresh: refreshBriefs
  } = usePagination('briefs', {
    pageSize: 20,
    orderBy: 'created_at',
    orderDirection: 'desc',
    select: '*, author:userId(name)',
    dependencies: []
  });

  // Paginación para tickets de soporte
  const {
    data: supportTickets,
    loading: ticketsLoading,
    error: ticketsError,
    paginationInfo: ticketsPagination,
    goToPage: goToTicketsPage,
    refresh: refreshTickets
  } = usePagination('support_tickets', {
    pageSize: 15,
    orderBy: 'created_at',
    orderDirection: 'desc',
    dependencies: []
  });

  // Paginación para suscriptores del newsletter
  const {
    data: newsletterSubscribers,
    loading: subscribersLoading,
    error: subscribersError,
    paginationInfo: subscribersPagination,
    goToPage: goToSubscribersPage,
    refresh: refreshSubscribers
  } = usePagination('newsletter_subscribers', {
    pageSize: 25,
    orderBy: 'subscribed_at',
    orderDirection: 'desc',
    dependencies: []
  });

  // Datos adicionales que no necesitan paginación
  const [additionalData, setAdditionalData] = useState({
    conversationsCount: 0,
    totalStats: {
      totalUsers: 0,
      totalBriefs: 0,
      totalConversations: 0,
      totalTickets: 0,
      totalSubscribers: 0
    }
  });

  const loadAdditionalData = useCallback(async () => {
    try {
      const [
        { count: conversationsCount },
        { count: totalUsers },
        { count: totalBriefs },
        { count: totalTickets },
        { count: totalSubscribers }
      ] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('briefs').select('id', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true })
      ]);

      setAdditionalData({
        conversationsCount: conversationsCount || 0,
        totalStats: {
          totalUsers: totalUsers || 0,
          totalBriefs: totalBriefs || 0,
          totalConversations: conversationsCount || 0,
          totalTickets: totalTickets || 0,
          totalSubscribers: totalSubscribers || 0
        }
      });
    } catch (error) {
      console.error('Error loading additional data:', error);
    }
  }, []);

  // Enriquecer datos de usuarios con URLs de avatar
  const enrichedUsers = useMemo(() => {
    if (!users) return [];
    return users.map(u => ({
      ...u,
      avatarUrl: u.avatarKey ? supabase.storage.from('avatars').getPublicUrl(u.avatarKey).data.publicUrl : null
    }));
  }, [users]);

  // Enriquecer datos de briefs con nombres de usuario
  const enrichedBriefs = useMemo(() => {
    if (!briefs) return [];
    return briefs.map(b => ({ ...b, userName: b.author?.name || 'N/A' }));
  }, [briefs]);

  useEffect(() => {
    if (user?.userType !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    loadAdditionalData();
    setIsLoading(false);
  }, [user, navigate, loadAdditionalData]);

  const handleVerifyUser = async (userId, action) => {
    try {
      const { error } = await supabase.rpc(
        action === 'approve' ? 'approve_verification' : 'reject_verification',
        { p_user_id: userId }
      );

      if (error) throw error;

      toast({
        title: action === 'approve' ? 'Usuario aprobado' : 'Usuario rechazado',
        description: `La verificación ha sido ${action === 'approve' ? 'aprobada' : 'rechazada'}.`,
      });

      // Refrescar datos
      refreshUsers();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Error',
        description: `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} la verificación.`,
        variant: 'destructive',
      });
    }
  };

  const handleRejectUser = (userId) => {
    handleVerifyUser(userId, 'reject');
  };

  const tabs = useMemo(() => {
    const baseTabs = [
      { value: 'verifications', label: 'Verificaciones', icon: <Shield className="w-4 h-4" /> },
      { value: 'users', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
      { value: 'briefs', label: 'Servicios', icon: <Briefcase className="w-4 h-4" /> },
      { value: 'analytics', label: 'Analíticas', icon: <BarChart2 className="w-4 h-4" /> },
      { value: 'content', label: 'Contenido', icon: <FileText className="w-4 h-4" /> },
      { value: 'blog', label: 'Blog', icon: <Newspaper className="w-4 h-4" /> },
      { value: 'newsletter', label: 'Newsletter', icon: <Rss className="w-4 h-4" /> },
      { value: 'support', label: 'Soporte', icon: <LifeBuoy className="w-4 h-4" /> },
      { value: 'admins', label: 'Administradores', icon: <UserPlus className="w-4 h-4" /> },
      { value: 'settings', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
    ];

    return baseTabs;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Panel de Administración - Taskora</title>
        <meta name="description" content="Panel de administración de Taskora" />
      </Helmet>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
              <p className="text-gray-600">Gestiona usuarios, servicios y configuraciones</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
                <Moon className="w-4 h-4" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{additionalData.totalStats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servicios</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{additionalData.totalStats.totalBriefs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{additionalData.totalStats.totalConversations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{additionalData.totalStats.totalTickets}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletter</CardTitle>
              <Rss className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{additionalData.totalStats.totalSubscribers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de administración */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="verifications">
                <VerificationsTab
                  users={enrichedUsers}
                  loading={usersLoading}
                  onVerifyUser={(userId) => handleVerifyUser(userId, 'approve')}
                  onRejectUser={handleRejectUser}
                  paginationInfo={usersPagination}
                  onPageChange={goToUsersPage}
                />
              </TabsContent>

              <TabsContent value="users">
                <UsersTab
                  users={enrichedUsers}
                  loading={usersLoading}
                  paginationInfo={usersPagination}
                  onPageChange={goToUsersPage}
                  onRefresh={refreshUsers}
                />
              </TabsContent>

              <TabsContent value="briefs">
                <ContentTab
                  briefs={enrichedBriefs}
                  loading={briefsLoading}
                  paginationInfo={briefsPagination}
                  onPageChange={goToBriefsPage}
                  onRefresh={refreshBriefs}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <AnalyticsTab data={additionalData.totalStats} />
              </TabsContent>

              <TabsContent value="content">
                <ContentTab
                  briefs={enrichedBriefs}
                  loading={briefsLoading}
                  paginationInfo={briefsPagination}
                  onPageChange={goToBriefsPage}
                  onRefresh={refreshBriefs}
                />
              </TabsContent>

              <TabsContent value="blog">
                <BlogManagementTab />
              </TabsContent>

              <TabsContent value="newsletter">
                <NewsletterTab
                  subscribers={newsletterSubscribers}
                  loading={subscribersLoading}
                  paginationInfo={subscribersPagination}
                  onPageChange={goToSubscribersPage}
                  onRefresh={refreshSubscribers}
                />
              </TabsContent>

              <TabsContent value="support">
                <SupportTab
                  tickets={supportTickets}
                  loading={ticketsLoading}
                  paginationInfo={ticketsPagination}
                  onPageChange={goToTicketsPage}
                  onRefresh={refreshTickets}
                />
              </TabsContent>

              <TabsContent value="admins">
                <AdminsTab />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
