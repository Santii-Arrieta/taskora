import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { UserPlus, Shield, Loader2, Mail, Key } from 'lucide-react';

const AdminsTab = ({ allUsers, setAllUsers }) => {
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password) {
      toast({ title: 'Error', description: 'Por favor, completa todos los campos.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data: result, error } = await supabase.rpc('create_admin', {
      p_email: newAdmin.email,
      p_password: newAdmin.password,
    });

    if (error) {
      toast({ title: 'Error al crear administrador', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'El nuevo administrador ha sido creado.' });
      const { data: newUserProfile } = await supabase.from('users').select('*').eq('id', result).single();
      if(newUserProfile) {
        setAllUsers(prev => [...prev, newUserProfile]);
      }
      setNewAdmin({ email: '', password: '' });
    }
    setLoading(false);
  };

  const admins = allUsers.filter(u => u.userType === 'admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserPlus className="w-5 h-5 mr-2" />Crear Nuevo Administrador</CardTitle>
          <CardDescription>Añade un nuevo usuario con permisos de administrador a la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del Administrador</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ejemplo.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña Temporal</Label>
              <div className="relative">
                 <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                   className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Crear Administrador
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Shield className="w-5 h-5 mr-2" />Administradores Actuales</CardTitle>
          <CardDescription>Lista de todos los usuarios con privilegios de administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{admin.name || 'Admin'}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminsTab;