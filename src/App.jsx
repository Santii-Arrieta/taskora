import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { ContractProvider } from '@/contexts/ContractContext';
import { useTheme } from '@/contexts/ThemeContext';
import MainLayout from '@/components/layout/MainLayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import BrowseBriefsPage from '@/pages/BrowseBriefsPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminDashboard from '@/pages/AdminDashboard';
import VerificationPage from '@/pages/VerificationPage';
import BriefDetailPage from '@/pages/BriefDetailPage';
import PublicProfilePage from '@/pages/PublicProfilePage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import FavoritesPage from '@/pages/FavoritesPage';
import WalletPage from '@/pages/WalletPage';
import SupportPage from '@/pages/SupportPage';
import WhyTaskoraPage from '@/pages/WhyTaskoraPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import CommunityPage from '@/pages/CommunityPage';
import BlogArticlePage from '@/pages/BlogArticlePage';
import { Toaster } from '@/components/ui/toaster';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { supabase } from '@/lib/customSupabaseClient';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence } from 'framer-motion';

const InitializeMercadoPago = () => {
  useEffect(() => {
    const loadAndInit = async () => {
      // 1) Try DB settings (admin-managed)
      let publicKey = null;
      const { data } = await supabase.from('settings').select('mpPublicKey').eq('id', 1).maybeSingle();
      if (data?.mpPublicKey) {
        publicKey = data.mpPublicKey;
        localStorage.setItem('mpSettings', JSON.stringify({ publicKey }));
      } else {
        // 2) Fallback to cached localStorage
        const cached = JSON.parse(localStorage.getItem('mpSettings') || '{}');
        publicKey = cached.publicKey || null;
      }

      // 3) Final fallback to test key to avoid breaking UI
      initMercadoPago(publicKey || 'TEST-c8551735-6592-44a8-8949-9a3395551a39', { locale: 'es-AR' });
    };
    loadAndInit();
  }, []);
  return null;
};

const PrivateRoute = ({ children, adminOnly = false, allowedRoles }) => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme}`}>
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.userType === 'admin' && !adminOnly) {
     return <Navigate to="/admin" replace />;
  }

  if (adminOnly && user.userType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const LoggedOutRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        );
    }

    if (user) {
        const from = (user.userType === 'admin' ? '/admin' : '/dashboard');
        return <Navigate to={from} replace />;
    }

    return children;
};

const VerificationRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.verified) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoggedOutRoute><LoginPage /></LoggedOutRoute>} />
          <Route path="/register" element={<LoggedOutRoute><RegisterPage /></LoggedOutRoute>} />
          <Route path="/forgot-password" element={<LoggedOutRoute><ForgotPasswordPage /></LoggedOutRoute>} />
          {/* Permitir acceso a reset-password incluso con sesión activa (enlace de recuperación crea una sesión temporal) */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/why-taskora" element={<WhyTaskoraPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/blog/:articleId" element={<BlogArticlePage />} />
          <Route path="/support" element={
            <PrivateRoute allowedRoles={['client', 'provider', 'ngo']}>
              <SupportPage />
            </PrivateRoute>
          } />
          <Route path="/browse" element={<BrowseBriefsPage />} />
          <Route path="/brief/:briefId" element={<BriefDetailPage />} />
          <Route 
            path="/user/:userId"
            element={
              <PrivateRoute>
                <PublicProfilePage />
              </PrivateRoute>
            }
          />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute allowedRoles={['client', 'provider', 'ngo']}>
                <DashboardPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <PrivateRoute allowedRoles={['client', 'provider', 'ngo']}>
                <ChatPage />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } 
          />
           <Route 
            path="/favorites" 
            element={
              <PrivateRoute allowedRoles={['client', 'provider']}>
                <FavoritesPage />
              </PrivateRoute>
            } 
          />
           <Route 
            path="/wallet" 
            element={
              <PrivateRoute allowedRoles={['client', 'provider', 'ngo']}>
                <WalletPage />
              </PrivateRoute>
            } 
          />
           <Route 
            path="/verification" 
            element={
              <VerificationRoute>
                <VerificationPage />
              </VerificationRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute adminOnly={true}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <WalletProvider>
            <ContractProvider>
              <ChatProvider>
                <Router>
                   <InitializeMercadoPago />
                   <AppRoutes />
                </Router>
              </ChatProvider>
            </ContractProvider>
          </WalletProvider>
        </NotificationProvider>
      </DataProvider>
      <Toaster />
    </AuthProvider>
  );
}

export default App;