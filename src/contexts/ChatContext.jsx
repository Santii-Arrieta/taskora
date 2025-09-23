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
  const [messages, setMessages] = useState({}); // Separate messages for each conversation
  const [chatSettings, setChatSettings] = useLocalStorageState('chatSettings', {
    defaultValue: { muted: [], blocked: [], starred: [] }
  });

  // Always enable chat data; avoid router dependencies inside provider

  const getUnreadCount = (convs) => {
    if (!user) return 0;
    return convs.reduce((count, conv) => {
      if (chatSettings.muted.includes(conv.id)) return count;
      const convMessages = messages[conv.id] || [];
      const unreadMessages = convMessages.filter(m => m.senderId !== user.id && !m.read).length;
      return count + unreadMessages;
    }, 0);
  };
  
  const [conversationsOffset, setConversationsOffset] = useState(0);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setActiveConversation(null);
      setMessages({});
      setConversationsOffset(0);
      return;
    }

    const { data: userConversations, error } = await supabase
      .from('conversations')
      .select('id,participants,lastMessage,createdAt')
      .filter('participants', 'cs', JSON.stringify([{ id: user.id }]))
      .range(conversationsOffset, conversationsOffset + 19); // load 20 conversations at a time

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
        return new Date(b.lastMessage?.created_at || b.createdAt) - new Date(a.lastMessage?.created_at || a.createdAt);
    });

    setConversations(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const newConversations = validConversations.filter(c => !existingIds.has(c.id));
      return [...prev, ...newConversations];
    });

  }, [user, chatSettings.blocked, chatSettings.starred, conversationsOffset]);

  const loadMoreConversations = () => {
    setConversationsOffset(prev => prev + 20);
  };

  const loadMessagesForConversation = async (conversationId) => {
    const { data: convMessages, error: msgError } = await supabase
      .from('messages')
      .select('id,conversation_id,sender_id,content,type,created_at,read')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (msgError) {
      console.error(`Error loading messages for conversation ${conversationId}:`, msgError);
      return;
    }
    setMessages(prev => ({ ...prev, [conversationId]: convMessages.reverse() }));
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      loadMessagesForConversation(activeConversation.id);
    }
  }, [activeConversation]);

  const createConversation = async (participant) => {
    if (!user) return null;
    if (chatSettings.blocked.includes(participant.id)) return null;

    const participantIds = [user.id, participant.id].sort();
    const conversationId = participantIds.join('_');
    
    const newConversation = {
      id: conversationId,
      participants: [
        {id: user.id, name: user.name, avatarUrl: user.avatarKey ? supabase.storage.from('avatars').getPublicUrl(user.avatarKey).data.publicUrl : null, userType: user.userType}, 
        {id: participant.id, name: participant.name, avatarUrl: participant.avatarKey ? supabase.storage.from('avatars').getPublicUrl(participant.avatarKey).data.publicUrl : null, userType: participant.userType}
      ],
      createdAt: new Date().toISOString(), lastMessage: null,
    };

    // Try simple insert first; on conflict, fetch existing
    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select('id,participants,lastMessage,createdAt')
      .single();

    let conversation = inserted;

    if (insertError) {
      // If duplicate, fetch existing conversation by primary key with minimal columns
      if (insertError.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('conversations')
          .select('id,participants,lastMessage,createdAt')
          .eq('id', conversationId)
          .maybeSingle();
        if (fetchError) {
          console.error('Error fetching existing conversation after conflict', fetchError);
          return null;
        }
        conversation = existing;
      } else {
        console.error('Error creating conversation', insertError);
        return null;
      }
    }

    if (!conversation) return null;

    setConversations(prev => {
      const exists = prev.find(c => c.id === conversation.id);
      return exists ? prev : [conversation, ...prev];
    });
    setActiveConversation(conversation);
    if (!messages[conversationId]) {
      const { data: convMessages } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id,content,type,created_at,read')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      setMessages(prev => ({ ...prev, [conversationId]: convMessages || [] }));
    }
    return conversation;
  };

  const sendMessage = async (conversationId, content, type = 'text') => {
    if (!user) return;
    
    if (chatSettings.muted.includes(conversationId)) {
      toast({ title: 'Chat silenciado', description: 'No puedes enviar mensajes en este chat.', variant: 'destructive' });
      return;
    }

    const otherParticipant = conversations.find(c => c.id === conversationId)?.participants.find(p => p.id !== user.id);
    if (chatSettings.blocked.includes(otherParticipant?.id)) {
        toast({ title: 'Usuario bloqueado', description: 'No puedes enviar mensajes a este usuario.', variant: 'destructive' });
        return;
    }

    const message = { id: Date.now().toString(), sender_id: user.id, content, type, timestamp: new Date().toISOString(), read: false };
    
    // Optimistic UI update
    setMessages(prev => {
      const convMessages = prev[conversationId] || [];
      return { ...prev, [conversationId]: [...convMessages, message] };
    });

    const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content, type }).select();
    if (error) {
      console.error("Error sending message", error);
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje.', variant: 'destructive' });
    }
  };

  const markAsRead = async (conversationId) => {
    if (!user) return;
    const convMessages = messages[conversationId] || [];

    const unreadMessages = convMessages.filter(msg => msg.sender_id !== user.id && !msg.read);
    if (unreadMessages.length === 0) return;

    const unreadIds = unreadMessages.map(m => m.id);

    const { error } = await supabase.from('messages').update({ read: true }).in('id', unreadIds);
    if (error) {
      console.error("Error marking as read", error);
      return;
    }

    // Update local state
    setMessages(prev => {
      const updatedMsgs = prev[conversationId].map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m);
      return { ...prev, [conversationId]: updatedMsgs };
    });
  };

  const clearChat = async (conversationId) => {
    if(!user) return;
    const { error } = await supabase.from('messages').delete().eq('conversation_id', conversationId);
    if (error) {
      toast({title: "Error", description: "No se pudo limpiar el chat.", variant: "destructive"});
    } else {
      toast({title: "Chat limpiado", description: "Se han borrado los mensajes de este chat."});
      setMessages(prev => ({ ...prev, [conversationId]: [] }));
    }
  }
  
  // Realtime disabled; manual refresh instead
  const refreshActiveConversationMessages = async () => {
    if (!activeConversation) return;
    await loadMessagesForConversation(activeConversation.id);
  };

  const toggleMute = (conversationId) => setChatSettings(prev => ({...prev, muted: prev.muted.includes(conversationId) ? prev.muted.filter(id => id !== conversationId) : [...prev.muted, conversationId] }));
  const toggleBlock = (participantId) => setChatSettings(prev => ({...prev, blocked: prev.blocked.includes(participantId) ? prev.blocked.filter(id => id !== participantId) : [...prev.blocked, participantId] }));
  const toggleStar = (conversationId) => {
    setChatSettings(prev => ({...prev, starred: prev.starred.includes(conversationId) ? prev.starred.filter(id => id !== conversationId) : [...prev.starred, conversationId] }));
  };
  
  useEffect(() => {
    // Keep activeConversation updated with latest data from conversations list
    const currentConv = conversations.find(c => c.id === activeConversation?.id);
    if (currentConv) {
        setActiveConversation(currentConv);
    }
  }, [conversations, activeConversation?.id]);


  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    createConversation,
    sendMessage,
    markAsRead,
    clearChat,
    unreadCount: getUnreadCount(conversations),
    chatSettings,
    toggleMute,
    toggleBlock,
    toggleStar,
    refreshActiveConversationMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
