import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Shield, MessageCircle, ArrowRight, CheckCircle, Briefcase, Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartNowClick = (e) => {
    if (user) {
      e.preventDefault();
      const destination = user.userType === 'admin' ? '/admin' : '/dashboard';
      navigate(destination);
    } else {
        navigate('/register');
    }
  };
  
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    
    if (error && error.code === '23505') { // Unique constraint violation
        toast({ title: "Ya estás suscrito", description: "Gracias por tu interés.", variant: "default" });
    } else if (error) {
        toast({ title: "Error", description: "No se pudo completar la suscripción.", variant: "destructive" });
    } else {
        toast({ title: "¡Suscripción exitosa!", description: "Gracias por unirte a nuestro newsletter." });
    }
    e.target.reset();
  };

  const features = [{
    icon: <Users className="w-8 h-8 text-primary" />,
    title: "Conecta Profesionales",
    description: "Une clientes con proveedores verificados para servicios de calidad"
  }, {
    icon: <Shield className="w-8 h-8 text-primary" />,
    title: "Verificación Completa",
    description: "Todos los proveedores pasan por un proceso de verificación riguroso"
  }, {
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
    title: "Chat Integrado",
    description: "Comunícate directamente con proveedores y clientes en tiempo real"
  }, {
    icon: <Heart className="w-8 h-8 text-primary" />,
    title: "Apoyo a ONGs",
    description: "Las ONGs pueden ofrecer oportunidades de trabajo para nuevos talentos"
  }];

  const userTypes = [{
    type: "Clientes",
    description: "Encuentra el talento perfecto para tu proyecto",
    icon: <Users className="w-12 h-12" />,
    color: "bg-blue-100 text-blue-700",
    benefits: ["Acceso a proveedores verificados", "Chat directo", "Garantía de calidad"]
  }, {
    type: "Proveedores",
    description: "Ofrece tus servicios y haz crecer tu negocio",
    icon: <Briefcase className="w-12 h-12" />,
    color: "bg-green-100 text-green-700",
    benefits: ["Verificación profesional", "Exposición global", "Herramientas de gestión"]
  }, {
    type: "ONGs",
    description: "Crea oportunidades para nuevos talentos",
    icon: <Heart className="w-12 h-12" />,
    color: "bg-red-100 text-red-700",
    benefits: ["Impacto social", "Desarrollo de talentos", "Red de colaboración"]
  }];

  return (
    <>
      <Helmet>
        <title>Taskora - Conecta con Profesionales</title>
        <meta name="description" content="Plataforma que conecta clientes con proveedores de servicios profesionales. Encuentra el talento perfecto para tu proyecto." />
      </Helmet>
      
      <Navbar />
      
      <div className="flex flex-col">
        <section className="relative overflow-hidden bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
                Conecta. Colabora. Crece.
                <span className="block text-primary">
                  El talento que buscas, a un clic.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Taskora es la plataforma que une clientes con proveedores de servicios verificados y ONGs con voluntarios. Encuentra calidad, confianza e impacto social en un solo lugar.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                
                  <Button size="lg" className="px-8 py-3 text-lg" onClick={handleStartNowClick}>
                    Comenzar Ahora
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                
                <Link to="/browse">
                  <Button size="lg" variant="outline" className="px-8 py-3 text-lg">
                    Explorar Servicios
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="why" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">¿Por qué elegir Taskora?</h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Ofrecemos una plataforma completa con todas las herramientas necesarias para conectar talento con oportunidades de forma segura y eficiente.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                  <Card className="h-full text-center hover:shadow-lg transition-shadow duration-300 border-border">
                    <CardHeader>
                      <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Únete a Nuestra Comunidad
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Diferentes perfiles, un mismo objetivo: crear conexiones profesionales exitosas.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
              {userTypes.map((userType, index) => (
                <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center border-border">
                    <CardHeader>
                      <div className={`mx-auto mb-4 p-4 ${userType.color} rounded-full w-fit`}>
                        {userType.icon}
                      </div>
                      <CardTitle className="text-2xl">{userType.type}</CardTitle>
                      <CardDescription className="text-base">
                        {userType.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-left">
                        {userType.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-start text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6 }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ¿Listo para comenzar?
              </h2>
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
                Únete a miles de profesionales que ya están creciendo con nosotros
              </p>
              
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg" onClick={handleStartNowClick}>
                  Crear Cuenta Gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
             
            </motion.div>
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-300 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="col-span-2 md:col-span-1">
                <Link to="/" className="flex items-center space-x-3 mb-4">
                    <img src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/eea516f257366e3a3d1db87621888c61.png" alt="Taskora Logo" className="h-8 object-contain filter invert" />
                </Link>
                <p className="text-gray-400">
                  Conectando talento con oportunidades desde 2025.
                </p>
              </div>
              
              <div>
                <span className="text-lg font-semibold text-white mb-4 block">Plataforma</span>
                <ul className="space-y-2">
                  <li><Link to="/browse" className="hover:text-white">Explorar</Link></li>
                  <li><Link to="/why-taskora" className="hover:text-white">¿Por qué Taskora?</Link></li>
                  <li><Link to="/community" className="hover:text-white">Comunidad</Link></li>
                </ul>
              </div>
              
              <div>
                <span className="text-lg font-semibold text-white mb-4 block">Legal</span>
                <ul className="space-y-2">
                  <li><Link to="/terms" className="hover:text-white">Términos de Servicio</Link></li>
                  <li><Link to="/privacy" className="hover:text-white">Política de Privacidad</Link></li>
                </ul>
              </div>
              
              <div>
                <span className="text-lg font-semibold text-white mb-4 block">Newsletter</span>
                <p className="text-sm text-gray-400 mb-2">Recibe nuestras últimas noticias y ofertas.</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
                  <Input name="email" type="email" placeholder="tu@email.com" required className="bg-gray-800 border-gray-700 text-white" />
                  <Button type="submit" variant="secondary">Suscribirse</Button>
                </form>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>© 2025 Taskora. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;