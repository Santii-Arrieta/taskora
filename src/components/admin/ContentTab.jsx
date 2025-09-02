import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContentTab = ({ briefs }) => {
  const navigate = useNavigate();

  const handleViewDetails = (briefId) => {
    navigate(`/brief/${briefId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Briefcase className="w-5 h-5 mr-2" />
          Gestión de Contenido
        </CardTitle>
        <CardDescription>
          Supervisa servicios y oportunidades publicadas en la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {briefs.length > 0 ? briefs.map((brief) => (
            <div key={brief.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{brief.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{brief.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Por: {brief.userName}</span>
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {brief.views} vistas
                  </span>
                  <span>${brief.price}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={`${
                    brief.type === 'opportunity' ? 'ngo-gradient' : 'provider-gradient'
                  } text-white`}
                >
                  {brief.type === 'opportunity' ? 'Oportunidad' : 'Servicio'}
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewDetails(brief.id)}
                >
                  Ver detalles
                </Button>
              </div>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-8">No hay publicaciones activas.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentTab;