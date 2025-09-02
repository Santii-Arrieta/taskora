import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    if (authUser.user_metadata?.isAdmin) {
      return { 
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata.name || 'Admin', 
        userType: 'admin', 
        isAdmin: true
      };
    }
    
    let userProfile = null;
    let attempts = 0;
    while (!userProfile && attempts < 5) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching user profile:", error);
            return null; // Stop if there's a real error
        }

        userProfile = data;
        if (!userProfile) {
            attempts++;
            await new Promise(res => setTimeout(res, 300 * attempts)); // wait longer each time
        }
    }

    if (!userProfile) {
      console.error("Failed to fetch user profile after several attempts for user:", authUser.id);
    }
    
    return userProfile;
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      }
      setLoading(false);
    };
    
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = async (formData) => {
    const { email, password } = formData;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    const authUser = data.user;
    
    const { data: adminCheck, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (adminCheck && !adminError) {
      const { error: updateMetaError } = await supabase.auth.updateUser({
        data: { isAdmin: true, name: authUser.user_metadata.name || 'Admin' }
      });
      if (updateMetaError) console.error("Error updating admin metadata:", updateMetaError);
    }
    
    return data.user;
  };

  const register = async (userData) => {
    const { email, password, name, userType } = userData;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          userType
        }
      }
    });
    if (signUpError) throw signUpError;
    
    return authData.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  
  const updateUser = async (updatedUserData) => {
    setUser(updatedUserData);
  }

  const updateProfile = async (updates) => {
    if (!user) return;
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
    if (error) {
        console.error("Error updating profile:", error);
    } else {
        setUser(data);
    }
  };

  const switchProfile = (newUserType) => {
    if (!user || user.userType === 'admin' || user.userType === 'ngo') return;
    updateProfile({ userType: newUserType });
  };

  const toggleFavorite = (briefId) => {
    if (!user) return;
    const favoritesKey = `favorites_${user.userType}`;
    const currentFavorites = user[favoritesKey] || [];
    const isFavorite = currentFavorites.includes(briefId);
    const newFavorites = isFavorite
      ? currentFavorites.filter(id => id !== briefId)
      : [...currentFavorites, briefId];
    updateProfile({ [favoritesKey]: newFavorites });
  };
  
  const value = { 
    user, 
    login, 
    register, 
    logout, 
    updateProfile, 
    updateUser,
    switchProfile,
    toggleFavorite,
    isAuthenticated: !!user, 
    loading 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};