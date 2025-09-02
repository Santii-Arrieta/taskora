import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo de recuperación. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Correo de recuperación enviado",
        description: "Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.",
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Helmet>
        <title>Recuperar Contraseña - Taskora</title>
        <meta name="description" content="Recupera el acceso a tu cuenta de Taskora." />
      </Helmet>

      <div className="absolute top-8 left-8">
        <Link to="/login" className="inline-flex items-center text-foreground/80 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a iniciar sesión
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <Link to="/">
              <img src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/eea516f257366e3a3d1db87621888c61.png" alt="Taskora Logo" className="h-10 mx-auto object-contain" />
            </Link>
            <CardTitle className="text-3xl font-bold text-foreground">
              ¿Olvidaste tu contraseña?
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              No te preocupes. Ingresa tu email y te enviaremos un enlace para recuperarla.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full text-white py-3"
                disabled={loading}
              >
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar enlace de recuperación'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;