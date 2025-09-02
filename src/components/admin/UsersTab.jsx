import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const UsersTab = ({ users, stats, setAllUsers }) => {
  const { toast } = useToast();

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'provider': return 'provider-gradient';
      case 'client': return 'client-gradient';
      case 'ngo': return 'ngo-gradient';
      case 'admin': return 'admin-gradient';
      default: return 'bg-gray-500';
    }
  };

  const getUserTypeLabel = (userType) => {
    switch (userType) {
      case 'provider': return 'Proveedor';
      case 'client': return 'Cliente';
      case 'ngo': return 'ONG';
      case 'admin': return 'Admin';
      default: return 'Usuario';
    }
  };
  
  const handleDeleteUser = async (userIdToDelete) => {
    const { data, error } = await supabase.functions.invoke('delete-user-admin', {
      body: { userId: userIdToDelete }
    });
    
    if (error || data.error) {
      toast({ title: 'Error', description: `No se pudo eliminar al usuario. ${error?.message || data.error}`, variant: 'destructive'});
      return;
    }

    setAllUsers(prev => prev.filter(user => user.id !== userIdToDelete));
    toast({ title: 'Usuario eliminado', description: 'El usuario y sus datos han sido eliminados.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Gestión de Usuarios
        </CardTitle>
        <CardDescription>
          Visualiza y gestiona todos los usuarios de la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Usuarios</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalProviders}</div>
              <div className="text-sm text-gray-600">Proveedores</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalClients}</div>
              <div className="text-sm text-gray-600">Clientes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.totalNGOs}</div>
              <div className="text-sm text-gray-600">ONGs</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {users.filter(u => u.userType !== 'admin').map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar className="w-10 h-10">
                   <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className={getUserTypeColor(user.userType)}>
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-gray-900">{user.name || 'Sin Nombre'}</h4>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`${getUserTypeColor(user.userType)} text-white`}>
                  {getUserTypeLabel(user.userType)}
                </Badge>
                {user.verified && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro de eliminar a {user.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminarán permanentemente el usuario y todos sus datos asociados (publicaciones, contratos, etc.).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                        Eliminar Usuario
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersTab;