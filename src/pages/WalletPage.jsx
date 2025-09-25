import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet } from '@mercadopago/sdk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const WalletPage = () => {
  const { user, updateProfile } = useAuth();
  const { balance, escrow, transactions, withdrawFunds } = useWallet();
  
  // Debug: mostrar balance actual
  console.log('Balance actual:', balance);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // Función para procesar pagos manualmente
  const testVerifyPayment = async (paymentId) => {
    try {
      console.log('Procesando pago manualmente:', { paymentId, userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { 
          paymentId: paymentId,
          userId: user.id 
        }
      });
      
      console.log('Respuesta de verify-payment:', { data, error });
      
      if (error) {
        console.error('Error en verify-payment:', error);
        toast({
          title: "Error",
          description: `Error: ${error.message || 'No se pudo procesar el pago'}`
        });
        return;
      }
      
      if (data?.success) {
        toast({
          title: "Pago Procesado",
          description: `Saldo actualizado: ${formatCurrency(data.newBalance)}`
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: `Error: ${data?.error || 'No se pudo procesar'}`
        });
      }
    } catch (error) {
      console.error('Error catch:', error);
      toast({
        title: "Error",
        description: "Error al procesar el pago"
      });
    }
  };

  // Función para limpiar transacciones duplicadas
  const cleanupDuplicateTransactions = async () => {
    try {
      console.log('Limpiando transacciones duplicadas...');
      
      // Eliminar TODAS las transacciones del usuario (limpieza completa)
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('userId', user.id);

      if (deleteError) {
        console.error('Error eliminando transacciones:', deleteError);
        toast({
          title: "Error",
          description: `Error: ${deleteError.message}`
        });
        return;
      }

      // Resetear saldo a 0
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: 0 })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error reseteando saldo:', updateError);
        toast({
          title: "Error",
          description: `Error: ${updateError.message}`
        });
        return;
      }

      console.log('Todas las transacciones eliminadas y saldo reseteado');
      
      toast({
        title: "Limpieza Completa",
        description: "Todas las transacciones eliminadas y saldo reseteado a $0"
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error catch:', error);
      toast({
        title: "Error",
        description: "Error al limpiar transacciones"
      });
    }
  };
  const [preferenceId, setPreferenceId] = useState(null);
  const [isProcessing, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const paymentStatus = query.get('status');
    const paymentId = query.get('payment_id');
    const collectionId = query.get('collection_id');
    
    console.log('URL params:', { paymentStatus, paymentId, collectionId, search: location.search });
    
    if (paymentStatus === 'approved' && (paymentId || collectionId)) {
      // Verificar y actualizar saldo si es necesario
      const verifyAndUpdateBalance = async () => {
        try {
          console.log('Verificando pago automáticamente:', { paymentId, collectionId, userId: user.id });
          
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { 
              paymentId: paymentId || collectionId,
              userId: user.id 
            }
          });
          
          console.log('Respuesta de verify-payment:', { data, error });
          
          if (error) {
            console.error('Error en verify-payment:', error);
            toast({
              title: "Error al procesar pago",
              description: `Error: ${error.message || 'No se pudo procesar el pago'}`
            });
            return;
          }
          
          if (data?.success) {
            toast({
              title: "Pago Confirmado",
              description: `Tu pago ha sido procesado. Saldo actualizado: ${formatCurrency(data.newBalance)}`
            });
            // Refrescar datos del wallet
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            toast({
              title: "Pago Aprobado",
              description: `Tu pago con ID ${paymentId || collectionId} ha sido aprobado. Tu saldo se actualizará pronto.`
            });
          }
        } catch (error) {
          console.error('Error catch:', error);
          toast({
            title: "Pago Aprobado",
            description: `Tu pago con ID ${paymentId || collectionId} ha sido aprobado. Tu saldo se actualizará pronto.`
          });
        }
      };
      
      verifyAndUpdateBalance();
      navigate('/wallet', { replace: true });
    }
  }, [location.search, toast, navigate, user.id]);

  const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);

  const createPreference = async () => {
    if (parseFloat(depositAmount) <= 0 || !parseFloat(depositAmount)) {
      toast({ title: "Monto inválido", description: "Por favor, ingresa un monto mayor a cero.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setPaymentError(false);
    const preferencePayload = {
      items: [{
        title: `Depósito de fondos para ${user.name}`,
        quantity: 1,
        unit_price: parseFloat(depositAmount),
        currency_id: 'ARS'
      }],
      back_urls: {
        success: 'https://taskora.webexperiencepro.com/wallet?status=approved',
        failure: 'https://taskora.webexperiencepro.com/wallet?status=failure',
        pending: 'https://taskora.webexperiencepro.com/wallet?status=pending'
      },
      auto_return: 'approved',
      external_reference: `deposit_${user.id}_${Date.now()}`
    };

    try {
      const { data, error } = await supabase.functions.invoke('create-mp-preference', {
        body: { body: preferencePayload }
      });

      if (error || data.error) {
        throw new Error(data?.error?.message || error?.message || 'Error al crear la preferencia');
      }
      setPreferenceId(data.id);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo crear la preferencia de pago: ${error.message}`,
        variant: "destructive"
      });
      setPaymentError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || !amount) {
      toast({ title: "Monto inválido", description: "Ingresa un monto válido.", variant: 'destructive' });
      return;
    }
    if (amount > balance) {
      toast({ title: "Fondos insuficientes", description: "No tienes saldo suficiente.", variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mp-payouts', { body: { amount } });
      if (error || data.error) {
        throw new Error(data?.error || error?.message || 'Error desconocido al retirar.');
      }
      const newBalance = balance - amount;
      await updateProfile({ balance: newBalance });
      await withdrawFunds(amount, "Retiro de fondos a Mercado Pago");
      toast({ title: "Retiro exitoso", description: "Los fondos están en camino a tu cuenta de Mercado Pago." });
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
    } catch (error) {
      toast({ title: "Error en el retiro", description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositClick = () => {
    setPreferenceId(null);
    setDepositAmount('');
    setIsDepositOpen(true);
    setPaymentError(false);
  };

  const handleWithdrawClick = () => {
    if (!user?.mp_cbu_alias) {
      toast({
        title: "Cuenta no conectada",
        description: "Debes conectar tu cuenta de Mercado Pago en tu perfil para poder retirar fondos.",
        variant: 'destructive'
      });
      navigate('/profile?tab=payments');
      return;
    }
    setWithdrawAmount('');
    setIsWithdrawOpen(true);
  };

  const TransactionIcon = ({ type }) => {
    const icons = {
      income: <ArrowDownLeft className="w-5 h-5 text-green-600" />,
      deposit: <ArrowDownLeft className="w-5 h-5 text-green-600" />,
      payment: <ArrowUpRight className="w-5 h-5 text-red-600" />,
      withdrawal: <ArrowUpRight className="w-5 h-5 text-red-600" />,
      escrow_payment: <ShieldCheck className="w-5 h-5 text-yellow-600" />,
      escrow_release: <ShieldCheck className="w-5 h-5 text-blue-600" />
    };
    const colors = {
      income: 'bg-green-100',
      deposit: 'bg-green-100',
      payment: 'bg-red-100',
      withdrawal: 'bg-red-100',
      escrow_payment: 'bg-yellow-100',
      escrow_release: 'bg-blue-100'
    };
    return <div className={`p-2 rounded-full ${colors[type] || 'bg-gray-100'}`}>{icons[type] || ''}</div>;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'in_process': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const renderDepositContent = () => {
    if (paymentError) {
      return (
        <div className="py-4 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Oh, no, algo anduvo mal.</h3>
          <p className="text-muted-foreground text-sm mb-4">No pudimos procesar tu solicitud. Por favor, intenta de nuevo.</p>
          <Button onClick={handleDepositClick}>Reintentar</Button>
        </div>
      )
    }

    if (isProcessing) {
      return <div className="py-4 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!preferenceId) {
      return (
        <>
          <div className="py-4">
            <Label htmlFor="amount">Monto (ARS)</Label>
            <Input id="amount" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Ej: 5000" />
          </div>
          <DialogFooter>
            <Button onClick={createPreference} disabled={!depositAmount || isProcessing}>
              Crear Link de Pago
            </Button>
          </DialogFooter>
        </>
      )
    }

    return (
      <div className="py-4 flex flex-col items-center">
        <p className="text-center mb-4">Completa la transacción para acreditar los fondos.</p>
        <Wallet 
            initialization={{ preferenceId: preferenceId }} 
            customization={{ texts:{ valueProp: 'smart_option' }}} 
            onError={() => setPaymentError(true)}
        />
      </div>
    )
  };

  return (
    <>
      <Helmet><title>Mi Billetera - Taskora</title><meta name="description" content="Gestiona tu saldo, transacciones y métodos de pago." /></Helmet>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center"><WalletIcon className="w-8 h-8 mr-3 text-primary" />Mi Billetera</h1>
          <p className="text-gray-600">Gestiona tu saldo, transacciones y métodos de pago de forma segura.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <CardHeader>
                <CardDescription className="text-gray-300">Saldo Disponible</CardDescription>
                <CardTitle className="text-4xl font-bold">{formatCurrency(balance)}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm text-gray-400">Fondos en garantía: {formatCurrency(escrow)}</p>
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleDepositClick} className="bg-white text-gray-900 hover:bg-gray-200"><Plus className="w-4 h-4 mr-2" />Depositar</Button>
                  <Button variant="outline" className="bg-transparent border-gray-400 text-white hover:bg-gray-700" onClick={handleWithdrawClick}>Retirar</Button>
                </div>
                
                {/* Botón temporal para procesar pagos manualmente */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const paymentId = prompt('Ingresa el ID del pago de Mercado Pago:');
                    if (paymentId) {
                      testVerifyPayment(paymentId);
                    }
                  }}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  🔧 Procesar Pago Manualmente
                </Button>
                
                {/* Botón temporal para limpiar transacciones duplicadas - OCULTO */}
                {false && (
                  <Button 
                    variant="destructive" 
                    onClick={cleanupDuplicateTransactions}
                    className="w-full mt-2 bg-orange-600 hover:bg-orange-700"
                  >
                    🧹 Limpiar TODAS las Transacciones
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Pagos Seguros</CardTitle>
                <CardDescription>Tus transacciones están protegidas con Mercado Pago.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <img src="https://horizons-cdn.hostinger.com/1f74fd1e-187f-4699-b213-a769a144b63a/version-horizontal-large-logo-mercado-pago-1024x267-jLAls.webp" alt="Mercado Pago" className="w-48" />
                {!user?.mp_cbu_alias ? <Button variant="link" className="mt-2" onClick={() => navigate('/profile?tab=payments')}>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Conectar mi cuenta
                    </Button> : <p className="text-sm text-green-600 flex items-center mt-2"><ShieldCheck className="w-4 h-4 mr-2" /> Cuenta conectada</p>}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle>Historial de Transacciones</CardTitle></CardHeader>
            <CardContent>
              {transactions.length > 0 ? <div className="space-y-4">
                  {transactions.map(tx => <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <TransactionIcon type={tx.type} />
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleString()}</p>
                          {tx.mp_payment_id && <p className="text-xs text-muted-foreground">ID Transacción: {tx.mp_payment_id}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                        {tx.status && <p className={`text-xs font-semibold uppercase ${getStatusColor(tx.status)}`}>{tx.status}</p>}
                      </div>
                    </div>)}
                </div> : <div className="text-center p-8">
                  <p className="text-muted-foreground">No hay transacciones todavía.</p>
                </div>}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Depositar Fondos con Mercado Pago</DialogTitle>
            <DialogDescription>Ingresa el monto que deseas depositar en tu billetera.</DialogDescription>
          </DialogHeader>
          {renderDepositContent()}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar Fondos</DialogTitle>
            <DialogDescription>Transfiere fondos de tu billetera Taskora a tu cuenta de Mercado Pago.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Monto a retirar (ARS)</Label>
              <Input id="withdraw-amount" type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder={`Máximo: ${formatCurrency(balance)}`} />
            </div>
            <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-1" />
                    <div>
                        <p className="font-semibold text-yellow-800 text-sm">Importante</p>
                        <p className="text-xs text-yellow-700">El retiro se procesará a la cuenta de Mercado Pago conectada. Las comisiones de Mercado Pago pueden aplicar.</p>
                    </div>
                </CardContent>
            </Card>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancelar</Button>
            <Button onClick={handleWithdraw} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Retiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletPage;