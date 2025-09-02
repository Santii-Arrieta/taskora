import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useContract } from '@/contexts/ContractContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, DollarSign, Star, CheckCircle, Users, Heart, Clock, Target, Briefcase, FileText, BarChart2, UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicationsTab from '@/components/dashboard/PublicationsTab';
import ContractsTab from '@/components/dashboard/ContractsTab';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ApplicantsTab from '@/components/dashboard/ApplicantsTab';
import ApplicationsTab from '@/components/dashboard/ApplicationsTab';

function useQuery() {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    query: new URLSearchParams(location.search),
    setQuery: (key, value) => {
      const params = new URLSearchParams(location.search);
      params.set(key, value);
      navigate({ search: params.toString() });
    }
  };
}

const DashboardPage = () => {
  const { user } = useAuth();
  const { contracts, markAsCompletedByProvider, confirmCompletionAndReleasePayment, addReview } = useContract();
  const { getData, updateData } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { query, setQuery } = useQuery();
  const [briefs, setBriefs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [applications, setApplications] = useState([]);
  
  const isVerified = user?.verified;
  const isPendingVerification = user?.verificationStatus === 'pending';

  const TABS_CONFIG = useMemo(() => ({
    client: [
      { value: 'contracts', label: 'Mis Contratos', icon: <Briefcase className="w-4 h-4 mr-2" /> }
    ],
    provider: [
      { value: 'overview', label: 'Resumen', icon: <BarChart2 className="w-4 h-4 mr-2" /> },
      { value: 'contracts', label: 'Mis Trabajos', icon: <Briefcase className="w-4 h-4 mr-2" /> },
      { value: 'publications', label: 'Mis Publicaciones', icon: <FileText className="w-4 h-4 mr-2" /> },
      { value: 'applications', label: 'Mis Postulaciones', icon: <UserCheck className="w-4 h-4 mr-2" /> }
    ],
    ngo: [
      { value: 'overview', label: 'Métricas', icon: <BarChart2 className="w-4 h-4 mr-2" /> },
      { value: 'applicants', label: 'Postulantes', icon: <Users className="w-4 h-4 mr-2" /> },
      { value: 'publications', label: 'Oportunidades', icon: <Target className="w-4 h-4 mr-2" /> }
    ],
  }), []);

  const userTabs = useMemo(() => TABS_CONFIG[user?.userType] || [], [user, TABS_CONFIG]);
  const activeTab = query.get('tab') || userTabs[0]?.value;

  const loadUserData = useCallback(async () => {
    if(!user) return;
    const allBriefs = await getData('briefs');
    const allReviews = await getData('reviews');
    
    const userBriefs = allBriefs.filter(brief => brief.userId === user.id);
    setBriefs(userBriefs);

    const userReviews = allReviews.filter(review => review.revieweeId === user.id);
    setReviews(userReviews);

    if (user.userType === 'ngo') {
      const myApplicants = userBriefs.flatMap(b => b.applications.map(app => ({...app, briefId: b.id, briefTitle: b.title})));
      setApplicants(myApplicants);
    }

    if (user.userType === 'provider') {
      const myApplications = allBriefs
        .filter(b => b.applications?.some(app => app.id === user.id))
        .map(b => ({
          briefId: b.id,
          briefTitle: b.title,
          ngoName: b.userName,
          status: b.applications.find(app => app.id === user.id).status,
          appliedDate: b.applications.find(app => app.id === user.id).date,
        }));
      setApplications(myApplications);
    }
  }, [user, getData]);

  useEffect(() => {
    if (user) {
      if ((user.userType === 'provider' || user.userType === 'ngo') && !isVerified) {
        if (user.verificationStatus === 'unverified' || user.verificationStatus === 'rejected') {
          navigate('/verification');
        }
      }
      loadUserData();
    }
  }, [user, navigate, isVerified, loadUserData]);

  useEffect(() => {
    if (userTabs.length > 0 && !userTabs.find(t => t.value === activeTab)) {
      setQuery('tab', userTabs[0].value);
    }
  }, [userTabs, activeTab, setQuery]);

  const handleAddReview = (contractId, rating, comment) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const isProvider = user.id === contract.providerId;
    const revieweeId = isProvider ? contract.clientId : contract.providerId;
    
    addReview(contractId, user.id, revieweeId, rating, comment);
    toast({ title: "Reseña enviada", description: "Gracias por tu feedback." });
  };

  const handleAcceptApplicant = async (briefId, applicantId) => {
    const allBriefs = await getData('briefs');
    const brief = allBriefs.find(b => b.id === briefId);
    if (!brief) return;

    const appIndex = brief.applications.findIndex(a => a.id === applicantId);
    if (appIndex === -1) return;

    brief.applications[appIndex].status = 'accepted';
    await updateData('briefs', briefId, { applications: brief.applications });
    loadUserData();
    toast({ title: "Postulante Aceptado", description: "El voluntario ha sido notificado." });
  };

  const stats = useMemo(() => {
    const completedContracts = contracts.filter(c => c.status === 'completed' && (c.providerId === user.id || c.clientId === user.id));
    const earnings = completedContracts
      .filter(c => c.providerId === user.id)
      .reduce((sum, c) => sum + Number(c.price), 0);
    
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 'N/A';
      
    const volunteerHours = briefs
      .filter(b => b.type === 'opportunity')
      .reduce((sum, b) => sum + (parseInt(b.deliveryTime) || 0) * (b.applications?.filter(a => a.status === 'accepted').length || 0), 0);

    return {
      earnings,
      completedJobs: completedContracts.length,
      avgRating,
      totalApplicants: applicants.length,
      volunteerHours,
      activeOpportunities: briefs.filter(b => b.status === 'active').length,
    };
  }, [contracts, user.id, reviews, applicants, briefs]);

  const renderVerificationBanner = () => {
    if ((user.userType === 'provider' || user.userType === 'ngo') && isPendingVerification) {
      return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800/50">
            <CardContent className="p-4 flex items-center">
              <ShieldAlert className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-4" />
              <div>
                <CardTitle className="text-yellow-800 dark:text-yellow-300 text-base">Verificación en Proceso</CardTitle>
                <p className="text-yellow-700 dark:text-yellow-400/80 text-sm">Tu solicitud está siendo revisada. No podrás publicar hasta ser verificado.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }
    return null;
  }

  const getDashboardTitle = () => ({
    provider: 'Dashboard de Proveedor', client: 'Dashboard de Cliente', ngo: 'Dashboard de ONG'
  })[user?.userType] || 'Dashboard';
  
  const ngoStatCards = [
    { title: "Voluntarios Activos", value: applicants.filter(a => a.status === 'accepted').length, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
    { title: "Oportunidades Activas", value: stats.activeOpportunities, icon: <Target className="h-4 w-4 text-muted-foreground" /> },
    { title: "Horas de Voluntariado", value: `${stats.volunteerHours} hs`, icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
    { title: "Postulantes Totales", value: stats.totalApplicants, icon: <Heart className="h-4 w-4 text-muted-foreground" /> },
  ];

  const providerStatCards = [
    { title: "Ganancias Totales", value: `$${(stats.earnings || 0).toFixed(2)}`, icon: <DollarSign className="h-4 w-4 text-muted-foreground" /> },
    { title: "Trabajos Completados", value: stats.completedJobs, icon: <CheckCircle className="h-4 w-4 text-muted-foreground" /> },
    { title: "Calificación Promedio", value: stats.avgRating, icon: <Star className="h-4 w-4 text-muted-foreground" /> },
    { title: "Postulaciones", value: applications.length, icon: <UserCheck className="h-4 w-4 text-muted-foreground" /> },
  ];

  if (!activeTab) return null;

  return (
    <>
      <Helmet><title>{getDashboardTitle()} - Taskora</title></Helmet>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center"><h1 className="text-3xl font-bold text-foreground">¡Hola, {user.name}! 👋</h1></div>
        </motion.div>
        
        {renderVerificationBanner()}

        <Tabs value={activeTab} onValueChange={(value) => setQuery('tab', value)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
            {userTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0">{tab.icon}{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          
          {user.userType !== 'client' && (
            <TabsContent value="overview">
              <DashboardStats stats={user.userType === 'ngo' ? ngoStatCards : providerStatCards} />
            </TabsContent>
          )}
          
          {user.userType === 'ngo' && (
            <TabsContent value="applicants">
              <ApplicantsTab applicants={applicants} onAccept={handleAcceptApplicant} />
            </TabsContent>
          )}

          {(user.userType === 'client' || user.userType === 'provider') && (
            <TabsContent value="contracts">
              <ContractsTab 
                contracts={contracts} 
                user={user}
                onMarkAsCompleted={markAsCompletedByProvider}
                onConfirmCompletion={confirmCompletionAndReleasePayment}
                onAddReview={handleAddReview}
              />
            </TabsContent>
          )}
          
          {(user.userType === 'provider' || user.userType === 'ngo') && (
            <TabsContent value="publications">
              <PublicationsTab 
                briefs={briefs}
                setBriefs={setBriefs}
              />
            </TabsContent>
          )}

          {user.userType === 'provider' && (
            <TabsContent value="applications">
              <ApplicationsTab applications={applications} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
};

export default DashboardPage;