import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Hourglass, Check, Star, MessageSquare, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const StarRatingInput = ({ rating, setRating }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            type="button"
            key={index}
            onClick={() => setRating(ratingValue)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 cursor-pointer transition-colors ${ratingValue <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-gray-400'}`}
            />
          </button>
        );
      })}
    </div>
  );
};

const ReviewDialog = ({ contract, onAddReview, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onAddReview(contract.id, rating, comment);
      setIsOpen(false);
    }
  };

  const isProvider = user.id === contract.providerId;
  const isClient = user.id === contract.clientId;

  const canReview = (isClient && !contract.reviewByClient) || (isProvider && !contract.reviewByProvider);

  if (!canReview) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><MessageSquare className="w-4 h-4 mr-2" /> Dejar Reseña</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deja tu reseña para "{contract.title}"</DialogTitle>
          <DialogDescription>Tu feedback es importante para la comunidad.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label>Calificación</Label>
            <StarRatingInput rating={rating} setRating={setRating} />
          </div>
          <div>
            <Label htmlFor="comment">Comentario</Label>
            <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Describe tu experiencia..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={rating === 0}>Enviar Reseña</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ContractCard = ({ contract, user, onMarkAsCompleted, onConfirmCompletion, onAddReview }) => {
  const isProvider = user.id === contract.providerId;
  const otherPartyName = isProvider ? contract.clientName : contract.providerName;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contract.title}</CardTitle>
        <CardDescription>
          {isProvider ? `Cliente: ${otherPartyName}` : `Proveedor: ${otherPartyName}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center text-sm">
          <p>Precio: <span className="font-bold text-green-600">${contract.price}<span className="ml-1 font-semibold">{(contract.priceType || 'total') === 'por_hora' ? '/hora' : '/unico'}</span></span></p>
          <Badge variant={contract.status === 'completed' ? 'success' : 'default'}>
            {contract.status === 'active' && 'Activo'}
            {contract.status === 'completed' && 'Completado'}
          </Badge>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center">
            {contract.completedByProvider ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Hourglass className="w-4 h-4 mr-2 text-yellow-500" />}
            <span>Entrega del Proveedor</span>
          </div>
          <div className="flex items-center">
            {contract.completedByClient ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Hourglass className="w-4 h-4 mr-2 text-yellow-500" />}
            <span>Confirmación del Cliente</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {isProvider && !contract.completedByProvider && contract.status === 'active' && (
          <Button onClick={() => onMarkAsCompleted(contract.id)}>
            <Check className="w-4 h-4 mr-2" /> Marcar como Realizado
          </Button>
        )}
        {!isProvider && contract.completedByProvider && !contract.completedByClient && contract.status === 'active' && (
          <Button onClick={() => onConfirmCompletion(contract.id)}>
            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar y Liberar Pago
          </Button>
        )}
        {contract.status === 'completed' && (
          <ReviewDialog contract={contract} onAddReview={onAddReview} user={user} />
        )}
      </CardFooter>
    </Card>
  );
};

const ContractsTab = ({ contracts, user, onMarkAsCompleted, onConfirmCompletion, onAddReview }) => {
  const userContracts = contracts.filter(c => {
    if (user.userType === 'client') return c.clientId === user.id;
    if (user.userType === 'provider' || user.userType === 'ngo') return c.providerId === user.id;
    return false;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trabajos</CardTitle>
        <CardDescription>Gestiona tus trabajos activos y completados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {userContracts.length > 0 ? (
          userContracts.map(contract => (
            <ContractCard 
              key={contract.id} 
              contract={contract} 
              user={user}
              onMarkAsCompleted={onMarkAsCompleted}
              onConfirmCompletion={onConfirmCompletion}
              onAddReview={onAddReview}
            />
          ))
        ) : (
          <div className="text-center p-8">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tienes trabajos.</h3>
            <p className="text-gray-600">Los trabajos que contrates o te contraten aparecerán aquí.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractsTab;