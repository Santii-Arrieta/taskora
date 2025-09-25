import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { KeyRound, Save, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { sendTransactionalEmail } from '@/lib/email';

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
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('admin@taskora.webexperiencepro.com');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (data) {
        setMpSettings({
          publicKey: data.mpPublicKey || '',
          accessToken: data.mpAccessToken || '',
        });
        setSmtpSettings({
          host: data.smtpHost || '',
          port: data.smtpPort || '',
          user: data.smtpUser || '',
          pass: data.smtpPass || '',
        });
      } else if (error && error.code !== 'PGRST116') {
        toast({ title: 'Error', description: 'No se pudo cargar la configuración.', variant: 'destructive'});
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [toast]);

  const handleMpInputChange = (e) => {
    const { name, value } = e.target;
    setMpSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSmtpInputChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({ ...prev, [name]: value }));
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

  const handleSaveSmtpSettings = async () => {
    setIsLoading(true);
    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.user || !smtpSettings.pass) {
        toast({
            title: 'Campos requeridos',
            description: 'Por favor, completa todos los campos de configuración SMTP.',
            variant: 'destructive',
        });
        setIsLoading(false);
        return;
    }
    
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        smtpHost: smtpSettings.host,
        smtpPort: smtpSettings.port,
        smtpUser: smtpSettings.user,
        smtpPass: smtpSettings.pass,
      }, { onConflict: 'id' });

    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración SMTP.', variant: 'destructive'});
    } else {
      toast({
        title: 'Configuración guardada',
        description: 'La configuración SMTP ha sido actualizada.',
      });
    }
    setIsLoading(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: 'Email requerido', description: 'Ingresá un correo destino para la prueba.', variant: 'destructive' });
      return;
    }
    setIsSendingTest(true);
    try {
      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #0B132B;">
          <h2 style="margin-bottom:8px;">Prueba SMTP Taskora</h2>
          <p>Este es un envío de prueba del servicio SMTP configurado.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="font-size:12px;color:#64748b;">Si ves este correo, la configuración SMTP está funcionando correctamente.</p>
        </div>
      `;
      await sendTransactionalEmail({
        to: testEmail,
        subject: 'Prueba SMTP Taskora',
        html,
      });
      toast({ title: 'Prueba enviada', description: `Se envió un correo a ${testEmail}.` });
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'No se pudo enviar el correo de prueba.', variant: 'destructive' });
    } finally {
      setIsSendingTest(false);
    }
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
            Configura el servidor de correo para enviar emails transaccionales, como la recuperación de contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="smtp-host">Host</Label>
                      <Input id="smtp-host" name="host" value={smtpSettings.host} onChange={handleSmtpInputChange} placeholder="smtp.example.com" />
                  </div>
                  <div>
                      <Label htmlFor="smtp-port">Puerto</Label>
                      <Input id="smtp-port" name="port" type="number" value={smtpSettings.port} onChange={handleSmtpInputChange} placeholder="587" />
                  </div>
              </div>
              <div>
                  <Label htmlFor="smtp-user">Usuario</Label>
                  <Input id="smtp-user" name="user" value={smtpSettings.user} onChange={handleSmtpInputChange} placeholder="user@example.com" />
              </div>
              <div>
                  <Label htmlFor="smtp-pass">Contraseña</Label>
                  <Input id="smtp-pass" name="pass" type="password" value={smtpSettings.pass} onChange={handleSmtpInputChange} placeholder="••••••••" />
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex gap-2">
                  <Button onClick={handleSaveSmtpSettings} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar Configuración SMTP
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <div className="w-64">
                    <Label htmlFor="test-email">Enviar prueba a</Label>
                    <Input id="test-email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="destinatario@correo.com" />
                  </div>
                  <Button onClick={handleSendTestEmail} disabled={isSendingTest}>
                    {isSendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Enviar email de prueba
                  </Button>
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