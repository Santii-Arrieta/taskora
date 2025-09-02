import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Eye } from 'lucide-react';

const ApplicantsTab = ({ applicants }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Postulantes</CardTitle>
        <CardDescription>Revisa los proveedores que se postularon a tus oportunidades.</CardDescription>
      </CardHeader>
      <CardContent>
        {applicants.length > 0 ? (
          <div className="space-y-4">
            {applicants.map(applicant => (
              <Card key={`${applicant.id}-${applicant.briefTitle}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={applicant.avatar} />
                      <AvatarFallback>{applicant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{applicant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Postuló para: <span className="font-medium text-foreground">{applicant.briefTitle}</span>
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link to={`/user/${applicant.id}`}><Eye className="mr-2 h-4 w-4" />Ver Perfil</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aún no hay postulantes.</h3>
            <p className="text-muted-foreground">Los postulantes a tus oportunidades aparecerán aquí.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicantsTab;