import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, XCircle, Clock, Star, User, Mail, Phone, Calendar } from 'lucide-react';

const ApplicationManagementCard = ({ brief, onApplicationUpdate }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, [brief.id]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Usar las aplicaciones que ya están en el brief
      if (brief.applications && Array.isArray(brief.applications)) {
        // Enriquecer cada aplicación con detalles del usuario
        const enrichedApplications = await Promise.all(
          brief.applications.map(async (application) => {
            try {
                          const { data: userDetails, error } = await supabase
                            .from('users')
                            .select('id, name, email, phone, bio, "userType", "createdAt"')
                            .eq('id', application.id)
                            .single();

              return {
                ...application,
                userDetails: userDetails || {
                  id: application.id,
                  name: application.name,
                  email: 'Email no disponible',
                  phone: null,
                  bio: null,
                  userType: 'provider',
                  createdAt: new Date().toISOString()
                }
              };
            } catch (error) {
              console.error('Error loading user details:', error);
              return {
                ...application,
                userDetails: {
                  id: application.id,
                  name: application.name,
                  email: 'Email no disponible',
                  phone: null,
                  bio: null,
                  userType: 'provider',
                  createdAt: new Date().toISOString()
                }
              };
            }
          })
        );
        
        setApplications(enrichedApplications);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicantId, newStatus) => {
    try {
      console.log('🔄 Updating application status:', { applicantId, newStatus, briefId: brief.id });
      
      // Verificar que supabase esté disponible
      if (!supabase) {
        console.error('❌ Supabase client is not available');
        toast({
          title: 'Error',
          description: 'Cliente de base de datos no disponible',
          variant: 'destructive'
        });
        return;
      }
      
      // Obtener las aplicaciones actuales
      const currentApplications = brief.applications || [];
      
      // Actualizar la aplicación específica
      const updatedApplications = currentApplications.map(app => {
        if (app.id === applicantId) {
          return {
            ...app,
            status: newStatus,
            updatedDate: new Date().toISOString()
          };
        }
        return app;
      });
      
      console.log('📝 Updated applications:', updatedApplications);
      
      // Actualizar directamente en la base de datos
      const { data, error } = await supabase
        .from('briefs')
        .update({ applications: updatedApplications })
        .eq('id', brief.id)
        .select();
        
      if (error) {
        console.error('❌ Error updating application status:', error);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el estado de la aplicación',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('✅ Application status updated successfully:', data);
      
      toast({
        title: 'Estado actualizado',
        description: `Aplicación ${newStatus === 'accepted' ? 'aceptada' : 'rechazada'} exitosamente`
      });
      
      // Recargar aplicaciones
      await loadApplications();
      
      // Notificar al componente padre
      if (onApplicationUpdate) {
        onApplicationUpdate();
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleMarkAsCompleted = (applicant) => {
    setSelectedApplicant(applicant);
    setReviewData({
      rating: 5,
      comment: `Excelente trabajo realizado en "${brief.title}". El voluntario demostró compromiso y dedicación.`
    });
    setIsReviewDialogOpen(true);
  };

  const submitCompletionReview = async () => {
    if (!selectedApplicant || !reviewData.comment.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('🔄 Completing volunteer work and creating review:', { selectedApplicant, reviewData });
      
      // Primero marcar como completado
      const currentApplications = brief.applications || [];
      const updatedApplications = currentApplications.map(app => {
        if (app.id === selectedApplicant.id) {
          return {
            ...app,
            status: 'completed',
            completedDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
          };
        }
        return app;
      });
      
      // Actualizar el brief
      const { data: updateData, error: updateError } = await supabase
        .from('briefs')
        .update({ applications: updatedApplications })
        .eq('id', brief.id)
        .select();

      if (updateError) {
        console.error('❌ Error marking as completed:', updateError);
        toast({
          title: 'Error',
          description: 'No se pudo marcar como completado',
          variant: 'destructive'
        });
        return;
      }

      console.log('✅ Marked as completed successfully:', updateData);

      // Crear la reseña directamente
      const { data: reviewData_result, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          "reviewerId": brief.userId,
          "revieweeId": selectedApplicant.id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          "briefId": brief.id,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        })
        .select();

      if (reviewError) {
        console.error('❌ Error creating review:', reviewError);
        toast({
          title: 'Error',
          description: 'No se pudo crear la reseña',
          variant: 'destructive'
        });
        return;
      }

                  console.log('✅ Review created successfully:', reviewData_result);

                  toast({
                    title: '¡Voluntariado completado!',
                    description: 'El voluntario ha sido marcado como completado y se ha creado la reseña'
                  });

                  setIsReviewDialogOpen(false);
                  setSelectedApplicant(null);
                  
                  // Recargar aplicaciones
                  await loadApplications();
                  
                  // Notificar al componente padre
                  if (onApplicationUpdate) {
                    onApplicationUpdate();
                  }
    } catch (error) {
      console.error('Error completing volunteer work:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
      accepted: { label: 'Aceptado', variant: 'default', icon: CheckCircle },
      rejected: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
      completed: { label: 'Completado', variant: 'success', icon: CheckCircle }
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

  const getStatusActions = (application) => {
    const status = application.status;

    switch (status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateApplicationStatus(application.id, 'accepted')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Aceptar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rechazar
            </Button>
          </div>
        );
      case 'accepted':
        return (
          <Button
            size="sm"
            onClick={() => handleMarkAsCompleted(application)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Marcar como Completado
          </Button>
        );
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Voluntariado Finalizado
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestionar Aplicaciones</CardTitle>
          <CardDescription>Cargando aplicaciones...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Gestionar Aplicaciones ({applications.length})
          </CardTitle>
          <CardDescription>
            Acepta, rechaza o marca como completados a los voluntarios que se postularon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay aplicaciones para esta oportunidad</p>
            </div>
          ) : (
            applications.map((application) => (
              <Card key={application.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={application.userDetails?.avatar} />
                        <AvatarFallback>
                          {application.userDetails?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{application.userDetails?.name || application.name}</h4>
                          {getStatusBadge(application.status)}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {application.userDetails?.email || 'Email no disponible'}
                          </div>
                          {application.userDetails?.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {application.userDetails.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Postulado: {new Date(application.date).toLocaleDateString()}
                          </div>
                          {application.completedDate && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Completado: {new Date(application.completedDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        {application.userDetails?.bio && (
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                            {application.userDetails.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusActions(application)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear reseña al marcar como completado */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Evaluar Voluntario</DialogTitle>
            <DialogDescription>
              Al marcar como completado, debes dejar una reseña sobre el desempeño del voluntario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                Evaluando a: {selectedApplicant?.userDetails?.name || selectedApplicant?.name}
              </p>
              <p className="text-xs text-blue-600">
                Oportunidad: {brief.title}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rating">Calificación (1-5 estrellas)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  id="rating"
                  min={1}
                  max={5}
                  step={1}
                  value={[reviewData.rating]}
                  onValueChange={([value]) => setReviewData(prev => ({ ...prev, rating: value }))}
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{reviewData.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comment">Comentario sobre el desempeño *</Label>
              <Textarea
                id="comment"
                placeholder="Describe cómo fue el trabajo del voluntario..."
                value={reviewData.comment}
                onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCompletionReview}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar y Evaluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicationManagementCard;
