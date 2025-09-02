import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, CheckCircle, UserCheck, UserX, FileText, Briefcase, Heart, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/customSupabaseClient';

const VerificationList = ({ users, onVerifyUser, onRejectUser, handleViewDocuments, userTypeLabel }) => {
  const getUserTypeColor = (userType) => ({
    provider: 'provider-gradient',
    ngo: 'ngo-gradient',
    client: 'client-gradient',
  })[userType] || 'bg-gray-500';

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No hay {userTypeLabel} pendientes de verificación.</p>
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className={`${getUserTypeColor(user.userType)} text-white`}>
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-gray-900">{user.name}</h4>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-gray-500">
                Registrado: {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handleViewDocuments(user)}>
              <FileText className="w-4 h-4 mr-1" /> Docs
            </Button>
            <Button size="sm" onClick={() => onVerifyUser(user.id, user.userType)} className="bg-green-600 hover:bg-green-700">
              <UserCheck className="w-4 h-4 mr-1" /> Verificar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onRejectUser(user.id)}>
              <UserX className="w-4 h-4 mr-1" /> Rechazar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const VerificationsTab = ({ pendingUsers, onVerifyUser, onRejectUser }) => {
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [docUrls, setDocUrls] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const handleViewDocuments = async (user) => {
    setViewingUser(user);
    setIsDocViewerOpen(true);
    setDocsLoading(true);
    setDocUrls([]);

    if (!user.verificationDocs || user.verificationDocs.length === 0) {
        setDocsLoading(false);
        return;
    };

    const urls = await Promise.all(
        user.verificationDocs.map(async (doc) => {
            const { data, error } = await supabase.storage
                .from('verifications')
                .createSignedUrl(doc.path, 3600); // URL válida por 1 hora
            if (error) {
                console.error("Error creating signed URL:", error);
                return { ...doc, url: null };
            }
            return { ...doc, url: data.signedUrl };
        })
    );
    setDocUrls(urls.filter(d => d.url));
    setDocsLoading(false);
  };

  const pendingProviders = pendingUsers.filter(u => u.userType === 'provider');
  const pendingNGOs = pendingUsers.filter(u => u.userType === 'ngo');
  const pendingClients = pendingUsers.filter(u => u.userType === 'client');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Verificaciones Pendientes
          </CardTitle>
          <CardDescription>
            Revisa y aprueba las solicitudes de verificación de todos los tipos de usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay verificaciones pendientes</h3>
              <p className="text-gray-600">Todos los usuarios elegibles están verificados.</p>
            </div>
          ) : (
            <Tabs defaultValue="clients">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="clients"><User className="w-4 h-4 mr-2" />Clientes ({pendingClients.length})</TabsTrigger>
                <TabsTrigger value="providers"><Briefcase className="w-4 h-4 mr-2" />Proveedores ({pendingProviders.length})</TabsTrigger>
                <TabsTrigger value="ngos"><Heart className="w-4 h-4 mr-2" />ONGs ({pendingNGOs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="clients" className="mt-4">
                <VerificationList users={pendingClients} onVerifyUser={onVerifyUser} onRejectUser={onRejectUser} handleViewDocuments={handleViewDocuments} userTypeLabel="clientes" />
              </TabsContent>
              <TabsContent value="providers" className="mt-4">
                <VerificationList users={pendingProviders} onVerifyUser={onVerifyUser} onRejectUser={onRejectUser} handleViewDocuments={handleViewDocuments} userTypeLabel="proveedores" />
              </TabsContent>
              <TabsContent value="ngos" className="mt-4">
                 <VerificationList users={pendingNGOs} onVerifyUser={onVerifyUser} onRejectUser={onRejectUser} handleViewDocuments={handleViewDocuments} userTypeLabel="ONGs" />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDocViewerOpen} onOpenChange={setIsDocViewerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documentos de {viewingUser?.name}</DialogTitle>
            <DialogDescription>Revisa los documentos subidos para la verificación.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto">
            {docsLoading ? (
                 <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : docUrls.length > 0 ? (
              <div className="space-y-4">
                {docUrls.map((doc, index) => (
                  <div key={index}>
                    <h4 className="font-semibold capitalize mb-2">{doc.fileName?.replace(/-\d+\.jpg$/, '') || 'Documento'}</h4>
                    {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer noopener">
                            <img src={doc.url} alt={doc.type} className="max-w-full rounded-md border" />
                        </a>
                    ) : (
                      <p className="text-muted-foreground">No se pudo cargar el documento.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No se encontraron documentos o el usuario no los ha subido.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerificationsTab;