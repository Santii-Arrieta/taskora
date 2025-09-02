import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SupportTab = ({ tickets, setData }) => {
    const { toast } = useToast();
    const [selectedTicket, setSelectedTicket] = useState(null);

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-red-100 text-red-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const getStatusLabel = (status) => {
        switch (status) {
            case 'open': return 'Abierto';
            case 'in_progress': return 'En Progreso';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    };

    const handleMarkAsClosed = async (ticketId) => {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: 'closed' })
            .eq('id', ticketId);

        if (error) {
            toast({ title: "Error", description: "No se pudo actualizar el ticket.", variant: "destructive" });
        } else {
            setData(prev => ({
                ...prev,
                supportTickets: prev.supportTickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t),
            }));
            toast({ title: "Ticket cerrado", description: "El ticket ha sido marcado como resuelto." });
            setSelectedTicket(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><MessageSquare className="w-5 h-5 mr-2" />Consultas de Soporte</CardTitle>
                    <CardDescription>Gestiona las consultas y problemas enviados por los usuarios.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {tickets.length > 0 ? tickets.map(ticket => (
                            <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted" onClick={() => setSelectedTicket(ticket)}>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                                    <p className="text-sm text-gray-600">De: {ticket.email}</p>
                                    <p className="text-xs text-gray-500">Recibido: {new Date(ticket.created_at).toLocaleString()}</p>
                                </div>
                                <Badge className={getStatusColor(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">No hay tickets de soporte.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                <DialogContent>
                    {selectedTicket && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                                <DialogDescription>
                                    De: <a href={`mailto:${selectedTicket.email}`} className="text-primary hover:underline">{selectedTicket.email}</a><br/>
                                    Recibido: {new Date(selectedTicket.created_at).toLocaleString()}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 max-h-[50vh] overflow-y-auto">
                                <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <a href={`mailto:${selectedTicket.email}?subject=RE: ${selectedTicket.subject}`}>
                                    <Button variant="outline"><Mail className="w-4 h-4 mr-2" /> Responder por Email</Button>
                                </a>
                                {selectedTicket.status !== 'closed' && (
                                     <Button onClick={() => handleMarkAsClosed(selectedTicket.id)}><Check className="w-4 h-4 mr-2" />Marcar como Resuelto</Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SupportTab;