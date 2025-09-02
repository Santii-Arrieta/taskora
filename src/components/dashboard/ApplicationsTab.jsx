import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

const ApplicationsTab = ({ applications }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aceptada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCheck className="w-6 h-6 mr-2" />Mis Postulaciones</CardTitle>
          <CardDescription>Aquí puedes ver el estado de las oportunidades a las que te has postulado.</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aún no te has postulado a ninguna oportunidad.</p>
              <Link to="/browse?type=opportunity">
                <span className="text-primary hover:underline mt-2 inline-block">Explorar oportunidades</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <Link to={`/brief/${app.briefId}`} className="hover:underline">
                          <p className="font-semibold text-lg">{app.briefTitle}</p>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Postulaste a la ONG: <span className="font-medium text-primary">{app.ngoName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fecha de postulación: {new Date(app.appliedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(app.status)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ApplicationsTab;