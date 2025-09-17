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
  const [chatSettings, setChatSettings] = useLocalStorageState('chatSettings', {
    defaultValue: { muted: [], blocked: [], starred: [] }
  });
  
  // Performance optimization refs
  const messageUpdateTimeoutRef = useRef(null);
  const readStatusTimeoutRef = useRef(null);
  const isUpdatingRef = useRef(false);

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

    // Build a set of unique participant IDs to enrich with profile data
    const participantIds = Array.from(new Set(
      (userConversations || []).flatMap(c => (c.participants || []).map(p => p.id))
    ));

    let profilesById = {};
    if (participantIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, name, userType, avatarKey')
        .in('id', participantIds);

      if (profilesError) {
        console.error('Error fetching participant profiles:', profilesError);
      } else {
        profilesById = Object.fromEntries(
          profiles.map(p => [p.id, p])
        );
      }
    }

    // Load messages for each conversation
    const conversationsWithMessages = await Promise.all(
      userConversations.map(async (conv) => {
        // Enrich participants with profile data (name, avatar, userType)
        const enrichedParticipants = (conv.participants || []).map(p => {
          const profile = profilesById[p.id];
          const avatarUrl = p.avatarUrl || (profile?.avatarKey
            ? supabase.storage.from('avatars').getPublicUrl(profile.avatarKey).data.publicUrl
            : null);
          return {
            id: p.id,
            name: p.name || profile?.name || 'Usuario',
            userType: p.userType || profile?.userType,
            avatarUrl
          };
        });

        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })
          .limit(50); // Load last 50 messages for performance

        if (messagesError) {
          console.error("Error loading messages:", messagesError);
          return { ...conv, participants: enrichedParticipants };
        }

        // Transform messages to match expected format
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          content: msg.content,
          type: msg.type,
          timestamp: msg.created_at,
          read: msg.read,
          delivered: true
        }));

        return {
          ...conv,
          participants: enrichedParticipants,
          messages: formattedMessages,
          lastMessage: formattedMessages.length > 0 ? formattedMessages[formattedMessages.length - 1] : null
        };
      })
    );

    const validConversations = conversationsWithMessages.filter(conv => {
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
    if (!user || isUpdatingRef.current) return;
    
    const convIndex = conversations.findIndex(c => c.id === conversationId);
    if (convIndex === -1) return;

    const otherParticipant = conversations[convIndex].participants.find(p => p.id !== user.id);
    if (chatSettings.blocked.includes(otherParticipant.id)) {
        toast({ title: 'Usuario bloqueado', description: 'No puedes enviar mensajes a este usuario.', variant: 'destructive' });
        return;
    }

    // Generate unique message ID with timestamp and random component
    const message = { 
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
      senderId: user.id, 
      content, 
      type, 
      timestamp: new Date().toISOString(), 
      read: false,
      delivered: false
    };
    
    // Optimistic update - update UI immediately
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

    // Use new optimized message insertion
    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content,
          type: type,
          read: false
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message", error);
        toast({ 
          title: 'Error', 
          description: 'No se pudo enviar el mensaje.', 
          variant: 'destructive' 
        });
        
        // Revert optimistic update on error
        setConversations(prevConvs => 
          prevConvs.map(c => 
            c.id === conversationId 
              ? { ...c, messages: c.messages.slice(0, -1) }
              : c
          )
        );
        
        if (activeConversation?.id === conversationId) {
          setActiveConversation(prev => 
            prev ? { 
              ...prev, 
              messages: prev.messages.slice(0, -1),
              lastMessage: prev.messages[prev.messages.length - 2] || null
            } : null
          );
        }
      } else {
        // Update with real message data
        const realMessage = {
          id: newMessage.id,
          senderId: newMessage.sender_id,
          content: newMessage.content,
          type: newMessage.type,
          timestamp: newMessage.created_at,
          read: newMessage.read,
          delivered: true
        };

        setConversations(prevConvs => 
          prevConvs.map(c => 
            c.id === conversationId 
              ? { 
                  ...c, 
                  messages: [...c.messages.slice(0, -1), realMessage],
                  lastMessage: realMessage
                }
              : c
          )
        );
        
        if (activeConversation?.id === conversationId) {
          setActiveConversation(prev => 
            prev ? { 
              ...prev, 
              messages: [...prev.messages.slice(0, -1), realMessage],
              lastMessage: realMessage
            } : null
          );
        }
      }
    } catch (err) {
      console.error("Unexpected error sending message:", err);
      toast({ 
        title: 'Error', 
        description: 'Error inesperado al enviar el mensaje.', 
        variant: 'destructive' 
      });
    }
  };

  const markAsRead = async (conversationId) => {
    if (!user) return;
    const conv = conversations.find(c => c.id === conversationId);
    if(!conv) return;

    // Clear any existing timeout
    if (readStatusTimeoutRef.current) {
      clearTimeout(readStatusTimeoutRef.current);
    }

    // Debounce read status updates to prevent timeout errors
    readStatusTimeoutRef.current = setTimeout(async () => {
      try {
        // Use the optimized database function
        const { data: updatedCount, error } = await supabase
          .rpc('mark_messages_as_read', {
            p_conversation_id: conversationId,
            p_user_id: user.id
          });

        if (error) {
          console.error("Error marking as read", error);
          return;
        }

        if (updatedCount > 0) {
          // Update local state immediately for better UX
          setConversations(prevConvs => 
            prevConvs.map(c => 
              c.id === conversationId 
                ? { 
                    ...c, 
                    messages: c.messages.map(msg => 
                      msg.senderId !== user.id ? { ...msg, read: true } : msg
                    )
                  }
                : c
            )
          );
          
          if (activeConversation?.id === conversationId) {
            setActiveConversation(prev => 
              prev ? { 
                ...prev, 
                messages: prev.messages.map(msg => 
                  msg.senderId !== user.id ? { ...msg, read: true } : msg
                )
              } : null
            );
          }
        }
      } catch (err) {
        console.error("Unexpected error in markAsRead:", err);
      }
    }, 500); // 500ms debounce to prevent rapid successive calls
  };

  const clearChat = async (conversationId) => {
    if(!user) return;
    
    // Delete all messages from the messages table
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
    
    if (messagesError) {
      toast({title: "Error", description: "No se pudo limpiar el chat.", variant: "destructive"});
    } else {
      toast({title: "Chat limpiado", description: "La conversación ha sido vaciada."});
      setActiveConversation(prev => prev ? {...prev, messages: []} : null);
      
      // Update conversations state
      setConversations(prevConvs => 
        prevConvs.map(c => 
          c.id === conversationId 
            ? { ...c, messages: [], lastMessage: null }
            : c
        )
      );
    }
  }

  const loadMoreMessages = async (conversationId, offset = 0, limit = 20) => {
    if (!user) return [];
    
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error loading more messages:", error);
        return [];
      }

      return messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        content: msg.content,
        type: msg.type,
        timestamp: msg.created_at,
        read: msg.read
      }));
    } catch (err) {
      console.error("Unexpected error loading more messages:", err);
      return [];
    }
  };
  
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, async (payload) => {
        try {
          const newMessage = payload.new;
          const conversationId = newMessage.conversation_id;
          
          // Check if this message is for a conversation the user is part of
          const userConv = conversations.find(c => c.id === conversationId);
          if (userConv) {
            // Ensure participants are enriched for realtime-inserted conversations
            const enrichedParticipants = (userConv.participants || []).map(p => p.name ? p : {
              ...p,
              name: 'Usuario'
            });
            const formattedMessage = {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              content: newMessage.content,
              type: newMessage.type,
              timestamp: newMessage.created_at,
              read: newMessage.read,
              delivered: true
            };

            // Update conversations state
            setConversations(prevConvs => 
              prevConvs.map(c => 
                c.id === conversationId 
                  ? { 
                      ...c,
                      participants: enrichedParticipants,
                      messages: [...c.messages, formattedMessage],
                      lastMessage: formattedMessage
                    }
                  : c
              )
            );
            
            // Update active conversation if it's the current one
            if(activeConversation?.id === conversationId) {
              setActiveConversation(prev => 
                prev ? { 
                  ...prev, 
                  messages: [...prev.messages, formattedMessage],
                  lastMessage: formattedMessage
                } : null
              );
            }
          }
        } catch (err) {
          console.error("Error processing new message:", err);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        try {
          const updatedMessage = payload.new;
          const conversationId = updatedMessage.conversation_id;
          
          const userConv = conversations.find(c => c.id === conversationId);
          if (userConv) {
            const formattedMessage = {
              id: updatedMessage.id,
              senderId: updatedMessage.sender_id,
              content: updatedMessage.content,
              type: updatedMessage.type,
              timestamp: updatedMessage.created_at,
              read: updatedMessage.read,
              delivered: true
            };

            // Update conversations state
            setConversations(prevConvs => 
              prevConvs.map(c => 
                c.id === conversationId 
                  ? { 
                      ...c, 
                      messages: c.messages.map(msg => 
                        msg.id === formattedMessage.id ? formattedMessage : msg
                      )
                    }
                  : c
              )
            );
            
            // Update active conversation if it's the current one
            if(activeConversation?.id === conversationId) {
              setActiveConversation(prev => 
                prev ? { 
                  ...prev, 
                  messages: prev.messages.map(msg => 
                    msg.id === formattedMessage.id ? formattedMessage : msg
                  )
                } : null
              );
            }
          }
        } catch (err) {
          console.error("Error processing message update:", err);
        }
      })
      .subscribe((status, err) => {
        if(status === 'SUBSCRIBED') {
          console.log("Realtime messages connected!");
        }
        if(err) {
          console.error("Realtime messages error", err);
          // Attempt to reconnect after a delay
          setTimeout(() => {
            console.log("Attempting to reconnect to realtime...");
          }, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation?.id, conversations]);


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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
      }
      if (readStatusTimeoutRef.current) {
        clearTimeout(readStatusTimeoutRef.current);
      }
    };
  }, []);


  const value = {
    conversations, activeConversation, setActiveConversation,
    createConversation, sendMessage, markAsRead, clearChat, loadMoreMessages,
    unreadCount: getUnreadCount(conversations),
    chatSettings, toggleMute, toggleBlock, toggleStar,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};