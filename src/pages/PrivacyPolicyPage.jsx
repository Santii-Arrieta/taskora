import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad - Taskora</title>
        <meta name="description" content="Nuestra Política de Privacidad explica cómo Taskora recopila, utiliza y protege su información personal." />
      </Helmet>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Política de Privacidad</h1>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="lead">Última actualización: 31 de julio de 2025</p>

            <p>Taskora ("nosotros", "nuestro" o "nos") opera el sitio web de Taskora (la "Plataforma"). Esta página le informa sobre nuestras políticas con respecto a la recopilación, uso y divulgación de datos personales cuando utiliza nuestra Plataforma y las opciones que ha asociado con esos datos.</p>
            
            <h2>1. Recopilación y Uso de Información</h2>
            <p>Recopilamos varios tipos diferentes de información para diversos fines para proporcionar y mejorar nuestra Plataforma para usted.</p>
            <h3>Tipos de Datos Recopilados</h3>
            <ul>
              <li><strong>Datos Personales:</strong> Mientras utiliza nuestra Plataforma, podemos pedirle que nos proporcione cierta información de identificación personal que se puede utilizar para contactarlo o identificarlo ("Datos Personales").</li>
              <li><strong>Datos de Uso:</strong> Podemos recopilar información sobre cómo se accede y utiliza la Plataforma ("Datos de Uso").</li>
              <li><strong>Datos de Seguimiento y Cookies:</strong> Utilizamos cookies y tecnologías de seguimiento similares para rastrear la actividad en nuestra Plataforma y mantener cierta información.</li>
            </ul>

            <h2>2. Uso de Datos</h2>
            <p>Taskora utiliza los datos recopilados para diversos fines:</p>
            <ul>
              <li>Para proporcionar y mantener nuestra Plataforma</li>
              <li>Para notificarle sobre cambios en nuestra Plataforma</li>
              <li>Para permitirle participar en funciones interactivas de nuestra Plataforma cuando elija hacerlo</li>
              <li>Para proporcionar atención al cliente</li>
              <li>Para recopilar análisis o información valiosa para que podamos mejorar nuestra Plataforma</li>
              <li>Para monitorear el uso de nuestra Plataforma</li>
              <li>Para detectar, prevenir y abordar problemas técnicos</li>
            </ul>

            <h2>3. Seguridad de los Datos</h2>
            <p>La seguridad de sus datos es importante para nosotros, pero recuerde que ningún método de transmisión por Internet o método de almacenamiento electrónico es 100% seguro. Si bien nos esforzamos por utilizar medios comercialmente aceptables para proteger sus Datos Personales, no podemos garantizar su seguridad absoluta.</p>

            <h2>4. Privacidad de los Niños</h2>
            <p>Nuestra Plataforma no se dirige a ninguna persona menor de 18 años ("Niños"). No recopilamos a sabiendas información de identificación personal de ninguna persona menor de 18 años.</p>

            <h2>5. Cambios a esta Política de Privacidad</h2>
            <p>Podemos actualizar nuestra Política de Privacidad de vez en cuando. Le notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página.</p>

            <h2>6. Contáctenos</h2>
            <p>Si tiene alguna pregunta sobre esta Política de Privacidad, contáctenos en <a href="mailto:privacy@taskora.com">privacy@taskora.com</a>.</p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;