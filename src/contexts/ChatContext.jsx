import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useLocalStorageState from 'use-local-storage-state';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [chatSettings, setChatSettings] = useLocalStorageState('chatSettings', {
    defaultValue: { muted: [], blocked: [], starred: [] }
  });

  const getUnreadCount = (convs) => {
    if (!user) return 0;
    return convs.reduce((count, conv) => {
      if (chatSettings.muted.includes(conv.id)) return count;
      const unreadMessages = (conv.messages || []).filter(m => m.senderId !== user.id && !m.read).length;
      return count + unreadMessages;
    }, 0);
  };
  
  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setActiveConversation(null);
      return;
    }
    
    const { data: userConversations, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', `[{"id":"${user.id}"}]`);

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    const validConversations = userConversations.filter(conv => {
      const otherParticipant = conv.participants.find(p => p.id !== user.id);
      return otherParticipant && !chatSettings.blocked.includes(otherParticipant.id);
    }).sort((a, b) => {
        const aIsStarred = chatSettings.starred.includes(a.id);
        const bIsStarred = chatSettings.starred.includes(b.id);
        if (aIsStarred && !bIsStarred) return -1;
        if (!aIsStarred && bIsStarred) return 1;
        return new Date(b.lastMessage?.timestamp || b.createdAt) - new Date(a.lastMessage?.timestamp || a.createdAt);
    });
    
    setConversations(validConversations);
    
  }, [user, chatSettings.blocked, chatSettings.starred]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createConversation = async (participant) => {
    if (!user) return null;
    if (chatSettings.blocked.includes(participant.id)) return null;

    const participantIds = [user.id, participant.id].sort();
    const conversationId = participantIds.join('_');
    
    const { data: existingConv } = await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle();
    
    if (existingConv) {
        setActiveConversation(existingConv);
        return existingConv;
    }

    const newConversation = {
      id: conversationId,
      participants: [
        {id: user.id, name: user.name, avatarUrl: user.avatarKey ? supabase.storage.from('avatars').getPublicUrl(user.avatarKey).data.publicUrl : null, userType: user.userType}, 
        {id: participant.id, name: participant.name, avatarUrl: participant.avatarKey ? supabase.storage.from('avatars').getPublicUrl(participant.avatarKey).data.publicUrl : null, userType: participant.userType}
      ],
      messages: [], createdAt: new Date().toISOString(), lastMessage: null,
    };

    const { data: addedConversation, error } = await supabase.from('conversations').insert(newConversation).select().single();
    if(error) {
      console.error("Error creating conversation", error);
      return null;
    }
    
    setConversations(prev => [addedConversation, ...prev]);
    setActiveConversation(addedConversation);
    return addedConversation;
  };

  const sendMessage = async (conversationId, content, type = 'text') => {
    if (!user) return;
    
    const convIndex = conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) return;

    const otherParticipant = conversations[convIndex].participants.find(p => p.id !== user.id);
    if (chatSettings.blocked.includes(otherParticipant.id)) {
        toast({ title: 'Usuario bloqueado', description: 'No puedes enviar mensajes a este usuario.', variant: 'destructive' });
        return;
    }

    const message = { id: Date.now().toString(), senderId: user.id, content, type, timestamp: new Date().toISOString(), read: false };
    
    const updatedConv = {
      ...conversations[convIndex],
      messages: [...(conversations[convIndex].messages || []), message],
      lastMessage: message,
    };

    const newConversations = [...conversations];
    newConversations[convIndex] = updatedConv;
    
    setConversations(newConversations);
    if (activeConversation?.id === conversationId) {
      setActiveConversation(updatedConv);
    }

    const { error } = await supabase.from('conversations').update({ messages: updatedConv.messages, lastMessage: message }).eq('id', conversationId);
    if (error) {
      console.error("Error sending message", error);
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje.', variant: 'destructive' });
      loadConversations();
    }
  };

  const markAsRead = async (conversationId) => {
    if (!user) return;
    const conv = conversations.find(c => c.id === conversationId);
    if(!conv) return;

    let changed = false;
    const updatedMessages = (conv.messages || []).map(msg => {
      if (msg.senderId !== user.id && !msg.read) {
        changed = true;
        return {...msg, read: true };
      }
      return msg;
    });

    if (changed) {
        const { error } = await supabase.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
        if(error) console.error("Error marking as read", error);
    }
  };

  const clearChat = async (conversationId) => {
    if(!user) return;
    const { error } = await supabase.from('conversations').update({ messages: [] }).eq('id', conversationId);
    if (error) {
      toast({title: "Error", description: "No se pudo limpiar el chat.", variant: "destructive"});
    } else {
      toast({title: "Chat limpiado", description: "La conversación ha sido vaciada."});
      setActiveConversation(prev => prev ? {...prev, messages: []} : null);
    }
  }
  
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
          const myParticipant = payload.new?.participants?.find(p => p.id === user.id);
          if (myParticipant) {
              setConversations(prevConvs => {
                const index = prevConvs.findIndex(c => c.id === payload.new.id);
                if (index > -1) {
                  const newConvs = [...prevConvs];
                  newConvs[index] = payload.new;
                  return newConvs;
                }
                return prevConvs;
              });
              if(activeConversation?.id === payload.new.id) {
                setActiveConversation(payload.new);
              }
          }
      })
      .subscribe((status, err) => {
        if(status === 'SUBSCRIBED') console.log("Realtime chat connected!");
        if(err) console.error("Realtime chat error", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation?.id]);


  const toggleMute = (conversationId) => setChatSettings(prev => ({...prev, muted: prev.muted.includes(conversationId) ? prev.muted.filter(id => id !== conversationId) : [...prev.muted, conversationId] }));
  const toggleBlock = (participantId) => setChatSettings(prev => ({...prev, blocked: prev.blocked.includes(participantId) ? prev.blocked.filter(id => id !== participantId) : [...prev.blocked, participantId] }));
  const toggleStar = (conversationId) => {
    setChatSettings(prev => ({...prev, starred: prev.starred.includes(conversationId) ? prev.starred.filter(id => id !== conversationId) : [...prev.starred, conversationId] }));
  };
  
  useEffect(() => {
    const currentConv = conversations.find(c => c.id === activeConversation?.id);
    if (currentConv) {
        setActiveConversation(currentConv);
    }
  }, [conversations, activeConversation?.id]);


  const value = {
    conversations, activeConversation, setActiveConversation,
    createConversation, sendMessage, markAsRead, clearChat,
    unreadCount: getUnreadCount(conversations),
    chatSettings, toggleMute, toggleBlock, toggleStar,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};