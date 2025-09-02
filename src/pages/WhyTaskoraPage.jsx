import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { Users, Shield, MessageCircle, Heart, ArrowRight, CheckCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const WhyTaskoraPage = () => {

  const features = [
    {
      icon: <Users className="w-12 h-12 text-primary" />,
      title: "Conexiones de Calidad",
      description: "Nuestra plataforma está diseñada para fomentar conexiones profesionales significativas. No solo encuentras un servicio, encuentras un socio para tu proyecto."
    }, 
    {
      icon: <Shield className="w-12 h-12 text-primary" />,
      title: "Seguridad y Confianza",
      description: "Con un riguroso proceso de verificación y un sistema de pago seguro (escrow), garantizamos que tanto clientes como proveedores operen en un entorno de máxima confianza."
    }, 
    {
      icon: <MessageCircle className="w-12 h-12 text-primary" />,
      title: "Comunicación Fluida",
      description: "Nuestro chat integrado permite una comunicación directa y eficiente, con herramientas para enviar ofertas, archivos y gestionar contratos sin salir de la plataforma."
    }, 
    {
      icon: <Heart className="w-12 h-12 text-primary" />,
      title: "Impacto Social Real",
      description: "Facilitamos la conexión entre ONGs y talento emergente, creando un ecosistema donde el crecimiento profesional y el impacto social van de la mano."
    }
  ];

  const userTypes = [{
    type: "Clientes",
    description: "Encuentra el talento perfecto para tu proyecto",
    icon: <Users className="w-12 h-12" />,
    color: "bg-blue-100 text-blue-700",
    benefits: ["Acceso a un pool de proveedores verificados y calificados.", "Sistema de pago seguro que libera fondos solo al confirmar el trabajo.", "Herramientas de gestión para seguir el progreso de tus contratos."]
  }, {
    type: "Proveedores",
    description: "Ofrece tus servicios y haz crecer tu negocio",
    icon: <Briefcase className="w-12 h-12" />,
    color: "bg-green-100 text-green-700",
    benefits: ["Obtén un perfil verificado que aumenta tu credibilidad.", "Accede a un flujo constante de oportunidades de clientes.", "Gestiona tus ofertas, contratos y pagos en un solo lugar."]
  }, {
    type: "ONGs",
    description: "Crea oportunidades para nuevos talentos",
    icon: <Heart className="w-12 h-12" />,
    color: "bg-red-100 text-red-700",
    benefits: ["Publica oportunidades de voluntariado y proyectos de impacto.", "Conecta con profesionales que desean contribuir a tu causa.", "Aumenta tu visibilidad y red de colaboradores."]
  }];

  return (
    <>
      <Helmet>
        <title>¿Por qué Taskora? - Conecta con Profesionales</title>
        <meta name="description" content="Descubre por qué Taskora es la mejor plataforma para conectar clientes, proveedores y ONGs. Seguridad, confianza e impacto social." />
      </Helmet>
      <Navbar />

      <main>
        <section className="bg-primary text-primary-foreground py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-4xl md:text-5xl font-extrabold tracking-tight"
            >
              ¿Por qué Taskora?
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }} 
              className="mt-4 max-w-3xl mx-auto text-lg"
            >
              Construimos más que una plataforma: creamos un ecosistema de confianza, calidad y oportunidades para todos.
            </motion.p>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true, amount: 0.5 }} 
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-6 p-4 bg-primary/10 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Una Plataforma para Todos
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Taskora está diseñado para satisfacer las necesidades específicas de cada perfil en nuestra comunidad.
              </p>
            </div>
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
              {userTypes.map((userType, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }} 
                  whileInView={{ opacity: 1, scale: 1 }} 
                  viewport={{ once: true, amount: 0.5 }} 
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-card p-8 rounded-lg shadow-lg"
                >
                  <div className={`mb-6 p-4 ${userType.color} rounded-full w-fit`}>
                    {userType.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{userType.type}</h3>
                  <p className="text-base text-muted-foreground mb-6">{userType.description}</p>
                  <ul className="space-y-3 text-left">
                    {userType.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, amount: 0.5 }} 
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ¿Listo para unirte?
              </h2>
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
                Forma parte de una comunidad que valora la calidad, la seguridad y el crecimiento mutuo.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Crear Cuenta Gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
};

export default WhyTaskoraPage;