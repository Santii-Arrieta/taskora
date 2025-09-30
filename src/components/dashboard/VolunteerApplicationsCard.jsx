import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, XCircle, Clock, Star, MapPin, Globe, Calendar, User } from 'lucide-react';

const VolunteerApplicationsCard = ({ user }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshApplications = () => {
    console.log('🔄 Manually refreshing applications...');
    loadApplications();
  };

  // Exponer la función de refresh para uso externo
  useEffect(() => {
    window.refreshVolunteerApplications = refreshApplications;
    return () => {
      delete window.refreshVolunteerApplications;
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      console.log('🔄 Loading applications for user:', user.id);
      loadApplications();
    }
  }, [user?.id]); // Recargar cuando cambie el usuario

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los briefs donde el usuario se postuló
      const { data: briefsData, error: briefsError } = await supabase
        .from('briefs')
                  .select(`
                    id,
                    title,
                    description,
                    price,
                    priceType,
                    serviceType,
                    location,
                    type,
                    applications,
                    "createdAt",
                    userId,
                    users!briefs_userId_fkey(name)
                  `)
        .not('applications', 'is', null);

      if (briefsError) {
        console.error('Error loading briefs:', briefsError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las aplicaciones',
          variant: 'destructive'
        });
        return;
      }

      console.log('Briefs data for volunteer applications (raw):', briefsData); // ADDED LOG
      console.log('Current user ID:', user.id); // ADDED LOG

      // Filtrar solo los briefs donde el usuario se postuló
      const userApplications = [];
      
      briefsData?.forEach(brief => {
        console.log('Processing brief:', brief.id, 'Applications:', brief.applications); // ADDED LOG
        if (brief.applications && Array.isArray(brief.applications)) {
          const userApplication = brief.applications.find(app => {
            console.log('Comparing:', app.id, 'with', user.id, 'Match:', app.id === user.id); // ADDED LOG
            return app.id === user.id;
          });
          if (userApplication) {
            console.log('Found user application:', userApplication); // ADDED LOG
            userApplications.push({
              ...userApplication,
              briefId: brief.id,
              briefTitle: brief.title,
              briefDescription: brief.description,
              briefPrice: brief.price,
              briefPriceType: brief.priceType,
              briefServiceType: brief.serviceType,
              briefLocation: brief.location,
              briefType: brief.type,
              briefCreatedAt: brief.createdAt,
              ngoName: brief.users?.name || 'ONG',
              ngoId: brief.userId
            });
          }
        }
      });

      setApplications(userApplications);
      console.log('User applications (processed):', userApplications); // ADDED LOG
      
      // Log detallado de cada aplicación para depurar
      userApplications.forEach((app, index) => {
        console.log(`Application ${index}:`, {
          briefId: app.briefId,
          briefTitle: app.briefTitle,
          status: app.status,
          appliedDate: app.date,
          ngoName: app.ngoName
        });
      });
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      accepted: { label: 'Aceptado', variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      rejected: { label: 'Rechazado', variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      completed: { label: 'Finalizado', variant: 'success', icon: CheckCircle, color: 'text-blue-600' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusMessage = (status) => {
    const messages = {
      pending: 'Tu aplicación está siendo revisada por la ONG',
      accepted: '¡Felicitaciones! Has sido aceptado para este voluntariado',
      rejected: 'Tu aplicación no fue seleccionada para este voluntariado',
      completed: '¡Excelente trabajo! Has completado exitosamente este voluntariado'
    };
    return messages[status] || messages.pending;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'border-l-yellow-500 bg-yellow-50',
      accepted: 'border-l-green-500 bg-green-50',
      rejected: 'border-l-red-500 bg-red-50',
      completed: 'border-l-blue-500 bg-blue-50'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mis Aplicaciones</CardTitle>
          <CardDescription>Cargando aplicaciones...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Mis Aplicaciones ({applications.length})
        </CardTitle>
        <CardDescription>
          Estado de tus postulaciones a oportunidades de voluntariado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tienes aplicaciones pendientes</p>
            <p className="text-sm">Postúlate a oportunidades de voluntariado para verlas aquí</p>
          </div>
        ) : (
          applications.map((application) => (
            <Card key={`${application.briefId}-${application.id}`} className={`border-l-4 ${getStatusColor(application.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{application.briefTitle}</h4>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {application.briefDescription}
                    </p>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">ONG:</span>
                        <span>{application.ngoName}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Precio:</span>
                        <span>${application.briefPrice} {(application.briefPriceType || 'total') === 'por_hora' ? '/hora' : '/único'}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Modalidad:</span>
                        <div className="flex items-center gap-1">
                          {application.briefServiceType === 'presencial' ? (
                            <MapPin className="w-3 h-3" />
                          ) : (
                            <Globe className="w-3 h-3" />
                          )}
                          {application.briefServiceType === 'presencial' ? 'Presencial' : 'Online'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Postulado:</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(application.date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {application.completedDate && (
                        <div className="flex items-center gap-4">
                          <span className="font-medium">Completado:</span>
                          <div className="flex items-center gap-1 text-blue-600">
                            <CheckCircle className="w-3 h-3" />
                            {new Date(application.completedDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 p-3 bg-white rounded-lg border">
                      <p className="text-sm font-medium text-gray-800">
                        {getStatusMessage(application.status)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default VolunteerApplicationsCard;
