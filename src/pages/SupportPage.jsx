import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { LifeBuoy, BookOpen, Mail } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const faqs = [
  {
    question: "¿Cómo me verifico como proveedor?",
    answer: "Para verificarte, ve a tu Dashboard, haz clic en 'Verificación' y sigue los pasos para subir tus documentos. Nuestro equipo los revisará en un plazo de 24-48 horas."
  },
  {
    question: "¿Cómo funcionan los pagos seguros?",
    answer: "Cuando un cliente paga por un servicio, el dinero se retiene en un depósito en garantía (escrow). Los fondos se liberan al proveedor solo cuando el cliente confirma que el trabajo se ha completado satisfactoriamente."
  },
  {
    question: "¿Puedo ser cliente y proveedor al mismo tiempo?",
    answer: "¡Sí! Puedes cambiar fácilmente entre tu perfil de cliente y proveedor desde el menú desplegable de tu perfil en la barra de navegación."
  },
  {
    question: "¿Qué hago si tengo un problema con un contrato?",
    answer: "Si tienes una disputa, primero intenta resolverla a través del chat. Si no es posible, contacta a nuestro equipo de soporte a través del formulario en esta página y mediaremos en la situación."
  }
];

const SupportPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
      user_id: user?.id,
    };
    
    const { error } = await supabase.from('support_tickets').insert(data);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar tu mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Mensaje Enviado",
        description: "Gracias por contactarnos. Nuestro equipo de soporte te responderá pronto.",
      });
      e.target.reset();
    }
  };

  return (
    <>
      <Helmet>
        <title>Ayuda y Soporte - Taskora</title>
        <meta name="description" content="Encuentra respuestas a tus preguntas y contacta a nuestro equipo de soporte." />
      </Helmet>
      <Navbar />
      <div className="bg-background">
        <header className="bg-primary text-primary-foreground py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center justify-center">
              <LifeBuoy className="w-12 h-12 mr-4" />
              Centro de Ayuda
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl mx-auto text-lg">
              ¿Necesitas ayuda? Estamos aquí para ti. Encuentra respuestas o contáctanos.
            </motion.p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <section id="faq">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <BookOpen className="w-8 h-8 mr-3 text-primary" />
                Preguntas Frecuentes
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>

          <div>
            <section id="contact">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <Mail className="w-8 h-8 mr-3 text-primary" />
                Contáctanos
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Envíanos un mensaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <Input name="email" type="email" placeholder="Tu email" defaultValue={user?.email || ''} required />
                    <Input name="subject" placeholder="Asunto" required />
                    <Textarea name="message" placeholder="Describe tu problema..." rows={5} required />
                    <Button type="submit" className="w-full">Enviar Mensaje</Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default SupportPage;