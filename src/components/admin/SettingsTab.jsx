import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { KeyRound, Save, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const SettingsTab = () => {
  const { toast } = useToast();
  const [mpSettings, setMpSettings] = useState({
    publicKey: '',
    accessToken: '',
  });
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '',
    user: '',
    pass: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      
      // Obtener configuración de Mercado Pago desde la tabla settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('mpPublicKey, mpAccessToken')
        .eq('id', 1)
        .maybeSingle();
      
      if (settingsData) {
        setMpSettings({
          publicKey: settingsData.mpPublicKey || '',
          accessToken: settingsData.mpAccessToken || '',
        });
      } else if (settingsError && settingsError.code !== 'PGRST116') {
        toast({ title: 'Error', description: 'No se pudo cargar la configuración de Mercado Pago.', variant: 'destructive'});
      }

      // Obtener configuración SMTP desde Supabase (variables de entorno)
      try {
        const { data: smtpData, error: smtpError } = await supabase
          .from('settings')
          .select('smtpHost, smtpPort, smtpUser, smtpPass')
          .eq('id', 1)
          .maybeSingle();

        if (smtpData) {
          setSmtpSettings({
            host: smtpData.smtpHost || '',
            port: smtpData.smtpPort || '',
            user: smtpData.smtpUser || '',
            pass: smtpData.smtpPass || '',
          });
        } else {
          // Si no hay datos en la tabla, mostrar configuración de Supabase
          setSmtpSettings({
            host: 'Configurado en Supabase',
            port: 'Configurado en Supabase',
            user: 'Configurado en Supabase',
            pass: 'Configurado en Supabase',
          });
        }
      } catch (error) {
        // Fallback: mostrar que está configurado en Supabase
        setSmtpSettings({
          host: 'Configurado en Supabase',
          port: 'Configurado en Supabase',
          user: 'Configurado en Supabase',
          pass: 'Configurado en Supabase',
        });
      }
      
      setIsLoading(false);
    };
    fetchSettings();
  }, [toast]);

  const handleMpInputChange = (e) => {
    const { name, value } = e.target;
    setMpSettings(prev => ({ ...prev, [name]: value }));
  };


  const handleSaveMpSettings = async () => {
    setIsLoading(true);
    if (!mpSettings.publicKey || !mpSettings.accessToken) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor, completa ambas claves de API de Mercado Pago.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ 
        id: 1, 
        mpPublicKey: mpSettings.publicKey,
        mpAccessToken: mpSettings.accessToken
      }, { onConflict: 'id' });

    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive'});
    } else {
      toast({
        title: 'Configuración guardada',
        description: 'Las credenciales de Mercado Pago han sido actualizadas.',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <KeyRound className="w-5 h-5 mr-2" />
            Credenciales de Mercado Pago
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales de Producción que puedes encontrar en el{' '}
            <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Panel de Desarrolladores de Mercado Pago
            </a>. Estos datos se guardan de forma segura en la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <>
              <div>
                <Label htmlFor="publicKey">Public Key</Label>
                <Input
                  id="publicKey"
                  name="publicKey"
                  type="text"
                  value={mpSettings.publicKey}
                  onChange={handleMpInputChange}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <div>
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  type="password"
                  value={mpSettings.accessToken}
                  onChange={handleMpInputChange}
                  placeholder="PROD_ACCESS_TOKEN..."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveMpSettings} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Credenciales de MP
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Configuración de Email (SMTP)
          </CardTitle>
          <CardDescription>
            Configuración SMTP actual de Supabase para emails transaccionales (recuperación de contraseña, etc.). 
            Esta configuración está gestionada directamente por Supabase y no puede modificarse desde aquí.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="smtp-host">Host</Label>
                      <Input 
                        id="smtp-host" 
                        name="host" 
                        value={smtpSettings.host} 
                        readOnly 
                        className="bg-gray-50 cursor-not-allowed" 
                        placeholder="smtp.example.com" 
                      />
                  </div>
                  <div>
                      <Label htmlFor="smtp-port">Puerto</Label>
                      <Input 
                        id="smtp-port" 
                        name="port" 
                        type="number" 
                        value={smtpSettings.port} 
                        readOnly 
                        className="bg-gray-50 cursor-not-allowed" 
                        placeholder="587" 
                      />
                  </div>
              </div>
              <div>
                  <Label htmlFor="smtp-user">Usuario</Label>
                  <Input 
                    id="smtp-user" 
                    name="user" 
                    value={smtpSettings.user} 
                    readOnly 
                    className="bg-gray-50 cursor-not-allowed" 
                    placeholder="user@example.com" 
                  />
              </div>
              <div>
                  <Label htmlFor="smtp-pass">Contraseña</Label>
                  <Input 
                    id="smtp-pass" 
                    name="pass" 
                    type="password" 
                    value={smtpSettings.pass ? '••••••••' : ''} 
                    readOnly 
                    className="bg-gray-50 cursor-not-allowed" 
                    placeholder="••••••••" 
                  />
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex gap-2">
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800 font-medium">Configuración SMTP de Supabase</p>
                    <p className="text-xs text-blue-600">Los datos SMTP están gestionados directamente por Supabase y no pueden modificarse desde aquí</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;