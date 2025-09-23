import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/customSupabaseClient";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
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
        name: authUser.user_metadata.name || "Admin",
        userType: "admin",
        isAdmin: true,
      };
    }

    let userProfile = null;
    let attempts = 0;
    while (!userProfile && attempts < 5) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error);
        return null; // Stop if there's a real error
      }

      userProfile = data;
      if (!userProfile) {
        attempts++;
        await new Promise((res) => setTimeout(res, 300 * attempts)); // wait longer each time
      }
    }

    if (!userProfile) {
      console.error(
        "Failed to fetch user profile after several attempts for user:",
        authUser.id
      );
    }

    return userProfile;
  }, []);

  const ensureUserProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    // Try to get existing profile
    const { data: existing, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching user profile for ensure:", fetchError);
      return null;
    }

    if (existing) {
      // If user exists but userType is missing, default to client (unless admin)
      const needsUserType = !existing.userType || existing.userType === null;
      if (needsUserType) {
        let fallbackType = "client";
        if (authUser.email) {
          const { data: adminCheck } = await supabase
            .from("admins")
            .select("id")
            .eq("email", authUser.email)
            .maybeSingle();
          if (adminCheck) fallbackType = "admin";
        }
        const { data: updated } = await supabase
          .from("users")
          .update({ userType: fallbackType })
          .eq("id", authUser.id)
          .select()
          .maybeSingle();
        return updated || existing;
      }
      return existing;
    }

    // Determine default role
    let defaultUserType = "client";

    // If email exists in admins table, mark as admin
    if (authUser.email) {
      const { data: adminCheck, error: adminError } = await supabase
        .from("admins")
        .select("id")
        .eq("email", authUser.email)
        .maybeSingle();

      if (!adminError && adminCheck) {
        defaultUserType = "admin";
        // Best-effort: mirror metadata for admin
        const { error: updateMetaError } = await supabase.auth.updateUser({
          data: {
            isAdmin: true,
            name: authUser.user_metadata?.name || "Admin",
          },
        });
        if (updateMetaError)
          console.error(
            "Error updating admin metadata (OAuth):",
            updateMetaError
          );
      }
    }

    const newProfile = {
      id: authUser.id,
      email: authUser.email,
      name:
        authUser.user_metadata?.name ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split("@")[0] ||
        "Usuario",
      userType: "client",
    };

    console.log("🔍 Creating profile with Google OAuth:", newProfile);

    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .upsert([newProfile], { onConflict: "id", ignoreDuplicates: false })
      .select()
      .maybeSingle();

    console.log("📝 Upsert result:", { inserted, insertError });

    if (insertError) {
      console.error("Error creating user profile (OAuth):", insertError);
      return null;
    }

    // Safety: enforce userType right after upsert (handles cases where select is limited by RLS)
    const { data: fixed, error: fixError } = await supabase
      .from("users")
      .update({ userType: newProfile.userType })
      .eq("id", authUser.id)
      .is("userType", null)
      .select()
      .maybeSingle();

    console.log("🔧 Safety update result:", { fixed, fixError });

    return fixed || inserted;
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Ensure profile exists for OAuth or any auth method
        await ensureUserProfile(session.user);
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      }
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event, session?.user?.email);
      console.log("🔍 Full session object:", session);

      if (session) {
        console.log("👤 User authenticated, ensuring profile...");
        console.log("🔍 User object:", session.user);
        await ensureUserProfile(session.user);
        const profile = await fetchUserProfile(session.user);
        console.log("📋 Final user profile:", profile);
        setUser(profile);
      } else {
        console.log("🚪 User logged out");
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, ensureUserProfile]);

  const login = async (formData) => {
    const { email, password } = formData;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const authUser = data.user;

    const { data: adminCheck, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (adminCheck && !adminError) {
      const { error: updateMetaError } = await supabase.auth.updateUser({
        data: { isAdmin: true, name: authUser.user_metadata.name || "Admin" },
      });
      if (updateMetaError)
        console.error("Error updating admin metadata:", updateMetaError);
    }

    return data.user;
  };

  const loginWithGoogle = async () => {
    console.log("🚀 Starting Google OAuth login...");
    const redirectTo =
      import.meta?.env?.VITE_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : undefined) ||
      "https://taskora.webexperiencepro.com/";
    console.log("📍 Redirect URL:", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      console.error("❌ Google OAuth error:", error);
    } else {
      console.log("✅ Google OAuth initiated successfully");
    }
  };

  const register = async (userData) => {
    const { email, password, name, userType } = userData;
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          userType,
        },
      },
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
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) {
      console.error("Error updating profile:", error);
    } else {
      setUser(data);
    }
  };

  const switchProfile = (newUserType) => {
    if (!user || user.userType === "admin" || user.userType === "ngo") return;
    updateProfile({ userType: newUserType });
  };

  const toggleFavorite = (briefId) => {
    if (!user) return;
    const favoritesKey = `favorites_${user.userType}`;
    const currentFavorites = user[favoritesKey] || [];
    const isFavorite = currentFavorites.includes(briefId);
    const newFavorites = isFavorite
      ? currentFavorites.filter((id) => id !== briefId)
      : [...currentFavorites, briefId];
    updateProfile({ [favoritesKey]: newFavorites });
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    updateUser,
    switchProfile,
    toggleFavorite,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
