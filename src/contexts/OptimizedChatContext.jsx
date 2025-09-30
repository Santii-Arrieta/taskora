import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Estados para paginación de conversaciones
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsHasMore, setConversationsHasMore] = useState(true);
  const [conversationsOffset, setConversationsOffset] = useState(0);
  const conversationsPageSize = 20;

  // Estados para paginación de mensajes por conversación
  const [messagesLoading, setMessagesLoading] = useState({});
  const [messagesHasMore, setMessagesHasMore] = useState({});
  const [messagesOffset, setMessagesOffset] = useState({});
  const messagesPageSize = 50;

  // Referencias para evitar re-fetch innecesarios
  const lastConversationsFetch = useRef(null);
  const lastMessagesFetch = useRef({});

  const getUnreadCount = (convs) => {
    if (!user) return 0;
    return convs.reduce((count, conv) => {
      if (chatSettings.muted.includes(conv.id)) return count;
      const convMessages = messages[conv.id] || [];
      const unreadMessages = convMessages.filter(m => m.senderId !== user.id && !m.read).length;
      return count + unreadMessages;
    }, 0);
  };

  const loadConversations = useCallback(async (reset = false) => {
    if (!user) {
      setConversations([]);
      setActiveConversation(null);
      setMessages({});
      setConversationsOffset(0);
      setConversationsHasMore(true);
      return;
    }

    setConversationsLoading(true);
    
    try {
      const offset = reset ? 0 : conversationsOffset;
      const queryKey = `conversations_${user.id}_${offset}`;
      
      // Evitar re-fetch si es la misma consulta
      if (lastConversationsFetch.current === queryKey && !reset) {
        setConversationsLoading(false);
        return;
      }

      const { data: userConversations, error } = await supabase
        .from('conversations')
        .select('id,participants,lastMessage,createdAt')
        .filter('participants', 'cs', JSON.stringify([{ id: user.id }]))
        .range(offset, offset + conversationsPageSize - 1)
        .order('createdAt', { ascending: false });

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

      if (reset) {
        setConversations(validConversations);
        setConversationsOffset(conversationsPageSize);
      } else {
        setConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newConversations = validConversations.filter(c => !existingIds.has(c.id));
          return [...prev, ...newConversations];
        });
        setConversationsOffset(prev => prev + conversationsPageSize);
      }

      // Verificar si hay más conversaciones
      setConversationsHasMore(userConversations.length === conversationsPageSize);
      
      // Guardar clave de la consulta
      lastConversationsFetch.current = queryKey;

    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  }, [user, chatSettings.blocked, chatSettings.starred, conversationsOffset, conversationsPageSize]);

  const loadMoreConversations = useCallback(() => {
    if (!conversationsLoading && conversationsHasMore) {
      loadConversations(false);
    }
  }, [conversationsLoading, conversationsHasMore, loadConversations]);

  const loadMessagesForConversation = useCallback(async (conversationId, reset = false) => {
    if (!conversationId) return;

    setMessagesLoading(prev => ({ ...prev, [conversationId]: true }));
    
    try {
      const offset = reset ? 0 : (messagesOffset[conversationId] || 0);
      const queryKey = `messages_${conversationId}_${offset}`;
      
      // Evitar re-fetch si es la misma consulta
      if (lastMessagesFetch.current[conversationId] === queryKey && !reset) {
        setMessagesLoading(prev => ({ ...prev, [conversationId]: false }));
        return;
      }

      const { data: convMessages, error: msgError } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id,content,type,created_at,read')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + messagesPageSize - 1);

      if (msgError) {
        console.error(`Error loading messages for conversation ${conversationId}:`, msgError);
        return;
      }

      const reversedMessages = convMessages.reverse();

      if (reset) {
        setMessages(prev => ({ ...prev, [conversationId]: reversedMessages }));
        setMessagesOffset(prev => ({ ...prev, [conversationId]: messagesPageSize }));
      } else {
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), ...reversedMessages]
        }));
        setMessagesOffset(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + messagesPageSize
        }));
      }

      // Verificar si hay más mensajes
      setMessagesHasMore(prev => ({
        ...prev,
        [conversationId]: convMessages.length === messagesPageSize
      }));

      // Guardar clave de la consulta
      lastMessagesFetch.current = {
        ...lastMessagesFetch.current,
        [conversationId]: queryKey
      };

    } catch (error) {
      console.error(`Error loading messages for conversation ${conversationId}:`, error);
    } finally {
      setMessagesLoading(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [messagesOffset, messagesPageSize]);

  const loadMoreMessages = useCallback((conversationId) => {
    if (!messagesLoading[conversationId] && messagesHasMore[conversationId]) {
      loadMessagesForConversation(conversationId, false);
    }
  }, [messagesLoading, messagesHasMore, loadMessagesForConversation]);

  const refreshConversations = useCallback(() => {
    setConversationsOffset(0);
    setConversationsHasMore(true);
    loadConversations(true);
  }, [loadConversations]);

  const refreshMessages = useCallback((conversationId) => {
    setMessagesOffset(prev => ({ ...prev, [conversationId]: 0 }));
    setMessagesHasMore(prev => ({ ...prev, [conversationId]: true }));
    loadMessagesForConversation(conversationId, true);
  }, [loadMessagesForConversation]);

  // Cargar conversaciones iniciales
  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user, refreshConversations]);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (activeConversation) {
      if (!messages[activeConversation.id]) {
        refreshMessages(activeConversation.id);
      }
    }
  }, [activeConversation, messages, refreshMessages]);

  const createConversation = useCallback(async (otherUserId, briefId = null) => {
    if (!user) return null;

    try {
      // Verificar si ya existe una conversación
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .filter('participants', 'cs', JSON.stringify([{ id: user.id }, { id: otherUserId }]))
        .single();

      if (existingConv && !checkError) {
        setActiveConversation(existingConv);
        return existingConv;
      }

      // Crear nueva conversación
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participants: [{ id: user.id }, { id: otherUserId }],
          briefId: briefId,
          createdAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return null;
      }

      // Actualizar lista de conversaciones
      refreshConversations();
      
      setActiveConversation(newConv);
      return newConv;

    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user, refreshConversations]);

  const sendMessage = useCallback(async (conversationId, content, type = 'text') => {
    if (!user || !conversationId || !content.trim()) return;

    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          type: type,
          created_at: new Date().toISOString(),
          read: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      // Actualizar mensajes localmente
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));

      // Actualizar última conversación
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, lastMessage: newMessage }
          : conv
      ));

      return newMessage;

    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [user]);

  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!user || !conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Actualizar mensajes localmente
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg => 
          msg.sender_id !== user.id ? { ...msg, read: true } : msg
        )
      }));

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  const toggleMute = useCallback((conversationId) => {
    setChatSettings(prev => ({
      ...prev,
      muted: prev.muted.includes(conversationId)
        ? prev.muted.filter(id => id !== conversationId)
        : [...prev.muted, conversationId]
    }));
  }, [setChatSettings]);

  const toggleStar = useCallback((conversationId) => {
    setChatSettings(prev => ({
      ...prev,
      starred: prev.starred.includes(conversationId)
        ? prev.starred.filter(id => id !== conversationId)
        : [...prev.starred, conversationId]
    }));
  }, [setChatSettings]);

  const blockUser = useCallback((userId) => {
    setChatSettings(prev => ({
      ...prev,
      blocked: [...prev.blocked, userId]
    }));
    
    // Remover conversaciones con el usuario bloqueado
    setConversations(prev => prev.filter(conv => 
      !conv.participants.some(p => p.id === userId)
    ));
  }, [setChatSettings]);

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    chatSettings,
    conversationsLoading,
    conversationsHasMore,
    messagesLoading,
    messagesHasMore,
    loadMoreConversations,
    loadMoreMessages,
    refreshConversations,
    refreshMessages,
    createConversation,
    sendMessage,
    markMessagesAsRead,
    toggleMute,
    toggleStar,
    blockUser,
    getUnreadCount: getUnreadCount(conversations)
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
