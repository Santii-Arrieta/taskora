import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';

const ChatConversation = ({ conversation, onBack }) => {
  const { sendMessage, markAsRead } = useChat();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  useEffect(() => {
    if (conversation) {
      markAsRead(conversation.id);
    }
  }, [conversation, markAsRead]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    await sendMessage(conversation.id, newMessage.trim());
    setNewMessage('');
  };

  const getOtherParticipant = () => {
    if (!conversation || !user) return { name: "Usuario", id: null };
    return conversation.participants.find(p => p.id !== user.id) || { name: "Desconocido", id: null };
  };

  const otherParticipant = getOtherParticipant();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-white">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{otherParticipant.name}</h2>
          <p className="text-sm text-gray-500">
            {otherParticipant.userType === 'client' ? 'Cliente' : 
             otherParticipant.userType === 'provider' ? 'Proveedor' : 
             otherParticipant.userType === 'ngo' ? 'ONG' : 'Usuario'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {conversation?.messages?.length > 0 ? (
          conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.id}
              showStatus={message.senderId === user?.id}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No hay mensajes aún</p>
            <p className="text-sm">Envía el primer mensaje para comenzar la conversación</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatConversation;



