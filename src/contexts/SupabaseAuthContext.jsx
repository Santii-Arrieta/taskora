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

    if (authUser.email === 'admin@taskora.com') {
      const { data: adminProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();
      if (error) console.error("Error fetching admin profile: ", error);
      return adminProfile || null;
    }
    
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle setting user
  };

  const register = async (userData) => {
    const { email, password, name, userType } = userData;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;
    
    if (authData.user) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ name, userType })
            .eq('id', authData.user.id);

        if (updateError) {
            console.error("Error updating profile after signup:", updateError);
            // Optionally handle this error, e.g., by informing the user
        }
    }
    // onAuthStateChange will handle setting user
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  
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
    switchProfile,
    toggleFavorite,
    isAuthenticated: !!user, 
    loading 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};