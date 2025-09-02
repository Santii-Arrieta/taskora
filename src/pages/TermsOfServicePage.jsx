import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';

const TermsOfServicePage = () => {
  return (
    <>
      <Helmet>
        <title>Términos de Servicio - Taskora</title>
        <meta name="description" content="Lea nuestros Términos de Servicio para comprender las reglas y pautas para usar la plataforma Taskora." />
      </Helmet>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Términos de Servicio</h1>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="lead">Última actualización: 31 de julio de 2025</p>
            
            <p>Bienvenido a Taskora. Estos Términos de Servicio ("Términos") rigen su uso de nuestro sitio web, productos y servicios (colectivamente, la "Plataforma"). Al acceder o utilizar nuestra Plataforma, usted acepta estar sujeto a estos Términos.</p>

            <h2>1. Uso de la Plataforma</h2>
            <p>Usted se compromete a utilizar la Plataforma solo para fines lícitos y de acuerdo con estos Términos. Es responsable de garantizar que toda la información que proporcione sea precisa, actual y completa.</p>

            <h2>2. Cuentas de Usuario</h2>
            <p>Para acceder a ciertas funciones, es posible que deba registrarse para obtener una cuenta. Es responsable de mantener la confidencialidad de la contraseña de su cuenta y de todas las actividades que ocurran en su cuenta.</p>

            <h2>3. Contenido del Usuario</h2>
            <p>Usted conserva todos los derechos sobre el contenido que publica en la Plataforma. Sin embargo, al publicar contenido, nos otorga una licencia mundial, no exclusiva, libre de regalías para usar, reproducir y mostrar dicho contenido en relación con la operación de la Plataforma.</p>

            <h2>4. Conducta Prohibida</h2>
            <p>Usted se compromete a no participar en ninguna de las siguientes actividades prohibidas:</p>
            <ul>
              <li>Usar la plataforma para cualquier propósito ilegal.</li>
              <li>Acosar, amenazar o defraudar a otros usuarios.</li>
              <li>Hacerse pasar por otra persona o entidad.</li>
              <li>Publicar spam o cualquier comunicación comercial no autorizada.</li>
            </ul>

            <h2>5. Terminación</h2>
            <p>Podemos suspender o cancelar su acceso a la Plataforma en cualquier momento, por cualquier motivo, sin previo aviso. Esto puede resultar en la confiscación y destrucción de toda la información asociada con su cuenta.</p>

            <h2>6. Limitación de Responsabilidad</h2>
            <p>En la máxima medida permitida por la ley aplicable, Taskora no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo, ni de ninguna pérdida de ganancias o ingresos, ya sea incurrida directa o indirectamente, o cualquier pérdida de datos, uso, fondo de comercio u otras pérdidas intangibles.</p>

            <h2>7. Cambios a los Términos</h2>
            <p>Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos cualquier cambio publicando los nuevos Términos en esta página. Se le aconseja que revise estos Términos periódicamente para detectar cualquier cambio.</p>

            <h2>8. Contáctenos</h2>
            <p>Si tiene alguna pregunta sobre estos Términos, contáctenos en <a href="mailto:support@taskora.com">support@taskora.com</a>.</p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default TermsOfServicePage;