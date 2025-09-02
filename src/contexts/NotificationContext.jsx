import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';


const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const { user } = useAuth();
    const { addData, updateData } = useData();
    const { toast } = useToast();

    const loadNotifications = useCallback(async (userId) => {
        if (userId) {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('userId', userId)
                .order('createdAt', { ascending: false });

            if (error) {
                console.error("Error loading notifications:", error);
            } else {
                setNotifications(data);
            }
        } else {
            setNotifications([]);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadNotifications(user.id);

            const channel = supabase
                .channel(`public:notifications:userId=eq.${user.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT') {
                            const newNotification = payload.new;
                            setNotifications(prev => [newNotification, ...prev].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
                            toast({
                                title: newNotification.title,
                                description: newNotification.description,
                            });
                        } else {
                            loadNotifications(user.id);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setNotifications([]);
        }
    }, [user, loadNotifications, toast]);

    const addNotification = useCallback(async (notification) => {
        const targetUserId = notification.userId || user?.id;
        if (!targetUserId) return;

        const newNotification = {
            read: false,
            createdAt: new Date().toISOString(),
            ...notification,
        };
        
        await addData('notifications', newNotification);
        // Realtime listener will update the state
    }, [user, addData]);

    const markAsRead = useCallback(async (notificationId) => {
        if (!user) return;
        await updateData('notifications', notificationId, { read: true });
        setNotifications(currentNotifications =>
            currentNotifications.map(n => n.id === notificationId ? {...n, read: true} : n)
        );
    }, [user, updateData]);

    const markAllAsRead = useCallback(async () => {
        if (!user) return;
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);
        
        if (!error) {
          setNotifications(currentNotifications =>
              currentNotifications.map(n => ({...n, read: true}))
          );
        }
    }, [user, notifications]);

    const value = {
        notifications: notifications.filter(n => !n.read),
        allNotifications: notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};