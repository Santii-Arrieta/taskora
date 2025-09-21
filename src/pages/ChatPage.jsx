
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useContract } from '@/contexts/ContractContext';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Send, MessageCircle, Search, MoreVertical, Paperclip, Check, CheckCheck, FileText, FileSignature, DollarSign, Wallet, CheckCircle, Briefcase, Star, VolumeX, Ban, Loader2, StarOff, Volume2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/customSupabaseClient';

const ChatPage = () => {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, sendMessage, markAsRead, chatSettings, toggleMute, toggleBlock, toggleStar, clearChat } = useChat();
  const { createContract } = useContract();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [offerData, setOfferData] = useState({ title: '', description: '', price: '' });
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [isAcceptOfferOpen, setIsAcceptOfferOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

  // Separate effect for marking as read to prevent excessive calls
  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation?.id]); // Only trigger when conversation changes, not on every message

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeConversation) return;
    if (!user.verified) {
      toast({ title: "Verificación requerida", description: "Debes verificar tu cuenta para enviar mensajes.", variant: "destructive" });
      navigate('/verification');
      return;
    }
    sendMessage(activeConversation.id, message.trim());
    setMessage('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && activeConversation) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = { name: file.name, type: file.type, size: file.size, url: event.target.result };
        sendMessage(activeConversation.id, content, file.type.startsWith('image/') ? 'image' : 'file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOffer = () => {
    if (!offerData.title || !offerData.price || !activeConversation) return;
    const otherParticipant = getOtherParticipant(activeConversation);
    const offerContent = {
      ...offerData,
      price: parseFloat(offerData.price),
      providerId: user.id,
      providerName: user.name,
      providerAvatar: user.avatarKey ? supabase.storage.from('avatars').getPublicUrl(user.avatarKey).data.publicUrl : null,
      clientId: otherParticipant.id,
      clientName: otherParticipant.name,
      clientAvatar: otherParticipant.avatarUrl,
    };
    sendMessage(activeConversation.id, offerContent, 'offer');
    setIsOfferDialogOpen(false);
    setOfferData({ title: '', description: '', price: '' });
    toast({ title: "Oferta enviada", description: "Tu oferta ha sido enviada al cliente." });
  };

  const openAcceptOfferDialog = (offer) => {
    setSelectedOffer(offer);
    setIsAcceptOfferOpen(true);
  };

  const handleAcceptOffer = () => {
    if (!selectedOffer) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      const result = createContract(selectedOffer);
      if (result.success) {
        toast({ title: "¡Contrato iniciado!", description: "Has aceptado y pagado la oferta. El trabajo ha comenzado." });
        sendMessage(activeConversation.id, { contractId: result.contract.id, title: selectedOffer.title }, 'offer_accepted');
        setIsAcceptOfferOpen(false);
        setSelectedOffer(null);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsProcessing(false);
    }, 5000);
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !user) return { name: 'Usuario', id: null };
    return conversation.participants.find(p => p.id !== user.id) || { name: 'Desconocido', id: null };
  };

  const filteredConversations = (conversations || []).filter(conv => {
    const otherParticipant = getOtherParticipant(conv);
    const name = otherParticipant?.name?.toLowerCase?.() || '';
    const term = (searchTerm || '').toLowerCase();
    return name.includes(term);
  });

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const getUnreadMessagesCount = (conv) => user ? (conv.messages || []).filter(m => m.senderId !== user.id && !m.read).length : 0;

  const MessageContent = ({ msg }) => {
    switch (msg.type) {
      case 'image':
        return <img src={msg.content.url} alt={msg.content.name} className="rounded-lg max-w-xs cursor-pointer" onClick={() => window.open(msg.content.url, '_blank')} />;
      case 'file':
        return <a href={msg.content.url} download={msg.content.name} className="flex items-center bg-gray-200 p-2 rounded-lg hover:bg-gray-300"><FileText className="w-6 h-6 mr-2" /><div><p className="font-medium text-sm">{msg.content.name}</p><p className="text-xs text-gray-600">{(msg.content.size / 1024).toFixed(2)} KB</p></div></a>;
      case 'offer':
        return <Card className="bg-white shadow-lg border-primary border-2"><CardHeader className="bg-primary/10"><div className="flex items-center justify-between"><CardTitle className="flex items-center text-primary"><FileSignature className="w-5 h-5 mr-2" />Oferta de Trabajo</CardTitle><Avatar className="w-8 h-8"><AvatarImage src={msg.content.providerAvatar} /><AvatarFallback>{msg.content.providerName.charAt(0)}</AvatarFallback></Avatar></div></CardHeader><CardContent className="p-4 space-y-3"><p className="font-semibold text-lg">{msg.content.title}</p><p className="text-sm text-muted-foreground">{msg.content.description}</p><div className="flex items-center justify-between pt-2"><p className="text-2xl font-bold text-green-600 flex items-center"><DollarSign className="w-6 h-6 mr-1" />{msg.content.price}</p>{user.userType === 'client' && <Button onClick={() => openAcceptOfferDialog(msg.content)}>Aceptar y Pagar</Button>}</div></CardContent></Card>;
      case 'offer_accepted':
        return <div className="p-3 rounded-lg bg-green-100 text-green-800 flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-600" /><div className="flex-1"><p className="font-semibold">¡Oferta Aceptada!</p><p className="text-sm">El contrato para "{msg.content.title}" ha comenzado.</p><Button variant="link" className="p-0 h-auto text-green-800" onClick={() => navigate('/dashboard')}>Ver en el dashboard</Button></div></div>;
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  const handleToggleStar = () => {
    toggleStar(activeConversation.id);
    toast({ title: chatSettings.starred.includes(activeConversation.id) ? 'Chat quitado de destacados' : 'Chat destacado' });
  };

  const handleToggleMute = () => {
    toggleMute(activeConversation.id);
    toast({ title: chatSettings.muted.includes(activeConversation.id) ? 'Chat silenciado' : 'Sonido del chat activado' });
  };

  const handleToggleBlock = () => {
    const otherParticipant = getOtherParticipant(activeConversation);
    toggleBlock(otherParticipant.id);
    toast({ title: chatSettings.blocked.includes(otherParticipant.id) ? 'Usuario desbloqueado' : 'Usuario bloqueado', variant: chatSettings.blocked.includes(otherParticipant.id) ? 'default' : 'destructive' });
  };
  
  const handleClearChat = () => {
    clearChat(activeConversation.id);
    toast({title: "Chat limpiado", description: "Se han borrado los mensajes de este chat."});
  }

  return (
    <>
      <Helmet><title>Mensajes - Taskora</title><meta name="description" content="Gestiona tus conversaciones con clientes y proveedores." /></Helmet>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="lg:col-span-1"><Card className="h-full flex flex-col"><CardHeader className="pb-4"><CardTitle className="flex items-center"><MessageCircle className="w-5 h-5 mr-2" />Conversaciones</CardTitle><div className="relative mt-2"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></CardHeader><CardContent className="flex-1 overflow-y-auto p-0">{conversations.length === 0 ? <div className="p-6 text-center"><MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No hay conversaciones</h3><p className="text-gray-600 text-sm mb-4">Inicia una conversación para empezar.</p><Link to="/browse"><Button>Explorar</Button></Link></div> : <div className="space-y-1">{filteredConversations.map((conv) => { const other = getOtherParticipant(conv); const isActive = activeConversation?.id === conv.id; const unreadCount = getUnreadMessagesCount(conv); const isStarred = chatSettings.starred.includes(conv.id); return (<motion.div key={conv.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`} onClick={() => setActiveConversation(conv)}><div className="flex items-center space-x-3"><Avatar className="w-10 h-10"><AvatarImage src={other.avatarUrl} /><AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">{other.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate flex items-center">{other.name} {isStarred && <Star className="w-3 h-3 ml-1 text-yellow-400 fill-current" />}</p>{conv.lastMessage && <p className="text-sm text-gray-600 truncate">{conv.lastMessage.senderId === user.id ? 'Tú: ' : ''}{conv.lastMessage.type === 'text' ? conv.lastMessage.content : `[${conv.lastMessage.type}]`}</p>}</div><div className="flex flex-col items-end">{conv.lastMessage && <span className="text-xs text-gray-400 mb-1">{formatTime(conv.lastMessage.timestamp)}</span>}{unreadCount > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center">{unreadCount}</Badge>}</div></div></motion.div>); })}</div>}</CardContent></Card></div>
          <div className="lg:col-span-3"><Card className="h-full flex flex-col">{activeConversation ? (<><CardHeader className="border-b"><div className="flex items-center justify-between"><div className="flex items-center space-x-3"><Link to={`/user/${getOtherParticipant(activeConversation).id}`}><Avatar className="w-10 h-10"><AvatarImage src={getOtherParticipant(activeConversation).avatarUrl} /><AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">{getOtherParticipant(activeConversation).name.charAt(0).toUpperCase()}</AvatarFallback></Avatar></Link><div><h3 className="font-semibold text-gray-900">{getOtherParticipant(activeConversation).name}</h3><p className="text-sm text-green-600">En línea</p></div></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleToggleStar}>{chatSettings.starred.includes(activeConversation.id) ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />} {chatSettings.starred.includes(activeConversation.id) ? 'Quitar de destacados' : 'Destacar Chat'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleMute}>{chatSettings.muted.includes(activeConversation.id) ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />} {chatSettings.muted.includes(activeConversation.id) ? 'Activar sonido' : 'Silenciar'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleClearChat}><Trash2 className="mr-2 h-4 w-4" />Limpiar Chat</DropdownMenuItem>
              <DropdownMenuItem onSelect={handleToggleBlock} className="text-red-600"><Ban className="mr-2 h-4 w-4" />Bloquear</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div></CardHeader><div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">{(activeConversation.messages || []).map((msg, index) => { const isOwn = msg.senderId === user.id; return (<motion.div key={msg.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}><div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${isOwn ? 'chat-bubble-sent text-white' : 'bg-white text-gray-900'}`}><MessageContent msg={msg} /></div><div className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500 flex items-center gap-1`}>{formatTime(msg.timestamp)}{isOwn && (msg.read ? <CheckCheck className="w-4 h-4 text-blue-500" /> : <Check className="w-4 h-4" />)}</div></motion.div>); })}</div><div className="border-t p-4 bg-white"><form onSubmit={handleSendMessage} className="flex space-x-2 items-center"><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /><Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current.click()}><Paperclip className="w-4 h-4" /></Button>{user.userType === 'provider' && <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}><DialogTrigger asChild><Button type="button" variant="outline"><FileSignature className="w-4 h-4 mr-2" />Crear Oferta</Button></DialogTrigger><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary"/>Crear Oferta Profesional</DialogTitle><DialogDescription>Envía una oferta formal y detallada a {getOtherParticipant(activeConversation).name}.</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="title">Título del Servicio</Label><Input id="title" placeholder="Ej: Diseño de logo y branding" value={offerData.title} onChange={(e) => setOfferData({...offerData, title: e.target.value})} /></div><div className="space-y-2"><Label htmlFor="description">Descripción detallada</Label><Textarea id="description" placeholder="Describe el alcance, entregables y plazos." value={offerData.description} onChange={(e) => setOfferData({...offerData, description: e.target.value})} /></div><div className="space-y-2"><Label htmlFor="price">Precio Total (ARS)</Label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="price" type="number" placeholder="5000" className="pl-8" value={offerData.price} onChange={(e) => setOfferData({...offerData, price: e.target.value})} /></div></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsOfferDialogOpen(false)}>Cancelar</Button><Button type="button" onClick={handleSendOffer}>Enviar Oferta</Button></DialogFooter></DialogContent></Dialog>}<Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe tu mensaje..." className="flex-1" /><Button type="submit" disabled={!message.trim()}><Send className="w-4 h-4" /></Button></form></div></>) : <CardContent className="flex-1 flex items-center justify-center"><div className="text-center"><MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-xl font-medium text-gray-900 mb-2">Selecciona una conversación</h3><p className="text-gray-600">Elige una conversación para empezar a chatear.</p></div></CardContent>}</Card></div>
        </div>
      </div>
      {selectedOffer && (
        <Dialog open={isAcceptOfferOpen} onOpenChange={setIsAcceptOfferOpen}>
          {isProcessing ? (
            <DialogContent>
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold">Procesando Pago...</h3>
                <p className="text-muted-foreground">Esto puede tardar unos segundos.</p>
              </div>
            </DialogContent>
          ) : (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar y Pagar Oferta</DialogTitle>
                <DialogDescription>Estás a punto de contratar a {selectedOffer.providerName} para el siguiente servicio.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="font-bold text-lg">{selectedOffer.title}</p>
                    <p className="text-muted-foreground text-sm">{selectedOffer.description}</p>
                    <p className="text-2xl font-bold text-green-600 mt-4">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(selectedOffer.price)}</p>
                  </CardContent>
                </Card>
                <div>
                  <Label>Pagar con Billetera</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md mt-2">
                    <Wallet className="w-4 h-4" />
                    <span>Saldo: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(user.balance)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAcceptOfferOpen(false)}>Cancelar</Button>
                <Button onClick={handleAcceptOffer}>Confirmar y Pagar</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      )}
    </>
  );
};

export default ChatPage;
