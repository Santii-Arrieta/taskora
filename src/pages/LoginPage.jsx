import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(formData);
      if (user) {
        toast({
          title: "¡Bienvenido de vuelta!",
          description: "Has iniciado sesión exitosamente.",
        });
      }
    } catch (error) {
      if (error?.message.includes("Email not confirmed")) {
        toast({
          title: "Confirma tu email",
          description:
            "Revisa tu bandeja de entrada y haz clic en el enlace de confirmación para activar tu cuenta.",
          variant: "destructive",
          duration: 9000,
        });
      } else if (
        error?.message.includes("Invalid login credentials") ||
        error?.message.includes("inválidas")
      ) {
        toast({
          title: "Error de autenticación",
          description:
            "El email o la contraseña son incorrectos. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error de autenticación",
          description:
            "El email o la contraseña son incorrectos. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Helmet>
        <title>Iniciar Sesión - Taskora</title>
        <meta
          name="description"
          content="Inicia sesión en Taskora para acceder a tu cuenta y conectar con profesionales."
        />
      </Helmet>

      <div className="absolute top-8 left-8">
        <Link
          to="/"
          className="inline-flex items-center text-foreground/80 hover:text-foreground transition-colors"
        >
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
              <img
                src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/eea516f257366e3a3d1db87621888c61.png"
                alt="Taskora Logo"
                className="h-10 mx-auto object-contain"
              />
            </Link>
            <CardTitle className="text-3xl font-bold text-foreground">
              Bienvenido de vuelta
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Inicia sesión en tu cuenta de Taskora
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-white py-3"
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>

            <div className="mt-6">
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400">o</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              <Button
                type="button"
                onClick={loginWithGoogle}
                variant="outline"
                className="w-full py-3 flex items-center justify-center gap-2"
              >
                <FcGoogle className="w-5 h-5" />
                Ingresar con Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
