import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, User, Mail, Lock, Briefcase, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userTypes = [
    { value: 'client', label: 'Cliente - Busco servicios' },
    { value: 'provider', label: 'Proveedor - Ofrezco servicios' },
    { value: 'ngo', label: 'ONG - Ofrezco oportunidades' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!formData.userType) {
      toast({ title: "Error", description: "Por favor selecciona un tipo de usuario", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      await register(formData);
      toast({
        title: "¡Registro exitoso!",
        description: "Hemos enviado un enlace de confirmación a tu correo. Por favor, revisa tu bandeja de entrada para activar tu cuenta.",
        duration: 9000,
      });
      navigate('/login');
    } catch (error) {
       toast({ 
         title: "Error en el registro", 
         description: error.message || "No se pudo crear la cuenta. El email puede que ya esté en uso.", 
         variant: "destructive" 
       });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, userType: value });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Helmet>
        <title>Registro - Taskora</title>
        <meta name="description" content="Crea tu cuenta en Taskora y comienza a conectar con profesionales o a ofrecer tus servicios." />
      </Helmet>

      <div className="absolute top-8 left-8">
        <Link to="/" className="inline-flex items-center text-foreground/80 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
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
              Crea tu Cuenta
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Únete a nuestra comunidad profesional
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input name="name" value={formData.name} onChange={handleChange} placeholder="Tu nombre completo" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tipo de usuario</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                  <Select onValueChange={handleSelectChange} required>
                    <SelectTrigger className="pl-10"><SelectValue placeholder="Selecciona tu rol" /></SelectTrigger>
                    <SelectContent>
                      {userTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>

              <Button type="submit" className="w-full text-white py-3" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;