import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

const SESSION_TIMEOUT = 8000;

// Quick validation: a real Supabase anon key is a JWT (200+ chars, starts with "eyJ")
function isValidAnonKey(key) {
  return key && key.startsWith('eyJ') && key.length > 100;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Track if we've finished initial auth setup
  const initDoneRef = useRef(false);

  // Fetch user profile from database
  async function fetchProfile(userId) {
    console.log('🔍 AuthContext: Fetching profile for user:', userId);
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ AuthContext: Failed to fetch profile:', profileError.message);
        return null;
      }

      // Fetch user's groups via group_members
      const { data: groupMemberships, error: groupsError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (groupsError) {
        console.error('❌ AuthContext: Failed to fetch group memberships:', groupsError.message);
      }

      // Build groups array and get primary group (first one)
      const groups = (groupMemberships || []).map(m => m.groups).filter(Boolean);
      const primaryGroup = groups[0] || null;
      const primaryGroupMembership = groupMemberships?.[0] || null;

      console.log('✅ AuthContext: Profile fetched successfully:', {
        id: profileData.id,
        role: profileData.role,
        groups: groups.length,
        primaryGroup: primaryGroup?.name,
      });

      // Return profile with groups array and legacy groupId/groupName for backward compatibility
      return {
        ...profileData,
        groups: primaryGroup, // Keep for backward compatibility with existing code
        userGroups: groups, // New: array of all user's groups
        userMemberships: groupMemberships || [], // New: full membership data
        groupId: primaryGroup?.id || null, // Legacy: primary group ID
        groupName: primaryGroup?.name || null, // Legacy: primary group name
        memberRole: primaryGroupMembership?.role || null, // User's role in primary group
      };
    } catch (err) {
      console.error('❌ AuthContext: Profile fetch exception:', err);
      return null;
    }
  }

  // Set user + profile together, only mark loading done when both are ready
  async function setAuthState(session) {
    console.log('🔄 AuthContext: setAuthState called with session:', !!session);
    if (session?.user) {
      setUser(session.user);
      console.log('🔄 AuthContext: User set, now fetching profile...');
      const profileData = await fetchProfile(session.user.id);
      setProfile(profileData);
      setAuthError(null);
    } else {
      console.log('🔄 AuthContext: No session, clearing user and profile');
      setUser(null);
      setProfile(null);
    }
    // Only mark init done once
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      console.log('✅ AuthContext: Initial loading complete');
      setLoading(false);
    }
  }

  // Initialize auth state
  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      console.log('🚀 AuthContext: Initializing auth...');
      try {
        // Pre-flight: validate anon key format
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!isValidAnonKey(anonKey)) {
          if (!cancelled) {
            setAuthError(
              `Invalid Supabase anon key. Your key is "${(anonKey || '').substring(0, 20)}..." — a valid key should be 200+ characters and start with "eyJ". Go to Supabase Dashboard → Settings → API and copy the full anon/public key.`
            );
            initDoneRef.current = true;
            setLoading(false);
          }
          return;
        }

        // Try to connect with timeout
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), SESSION_TIMEOUT)
          ),
        ]);

        if (cancelled) return;

        if (error?.message === 'timeout') {
          setAuthError('Cannot reach Supabase. Check your internet connection and Supabase URL.');
          initDoneRef.current = true;
          setLoading(false);
          return;
        }

        if (error) {
          console.error('❌ AuthContext: Supabase session error:', error.message);
          if (error.message?.includes('Invalid API key') || error.message?.includes('invalid_api_key')) {
            setAuthError('Invalid Supabase API key. Double-check your anon key in .env.');
          } else {
            setAuthError(error.message);
          }
          initDoneRef.current = true;
          setLoading(false);
          return;
        }

        // Set auth state (user + profile)
        await setAuthState(data?.session);
      } catch (err) {
        if (!cancelled) {
          console.error('❌ AuthContext: Auth initialization error:', err.message);
          if (err.message?.includes('timeout')) {
            setAuthError('Cannot reach Supabase. Check your internet connection and Supabase URL.');
          } else {
            setAuthError(err.message);
          }
          initDoneRef.current = true;
          setLoading(false);
        }
      }
    }

    // Run initial auth check
    initAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      console.log('🔄 AuthContext: Auth state change event:', _event);
      // For subsequent auth changes (not initial), we don't need to set loading
      // because the app is already rendered
      setAuthState(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Sign up
  async function signup({ email, password, firstName, lastName, role, groupId }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    });

    if (error) throw error;

    // Update profile with group_id if provided
    if (data.user && groupId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', data.user.id);

      if (profileError) {
        console.error('❌ AuthContext: Failed to update profile with group:', profileError.message);
      }
    }

    return data;
  }

  // Login
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  // Logout
  async function logout() {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('❌ AuthContext: Supabase signOut error:', err.message);
    } finally {
      setUser(null);
      setProfile(null);
      setAuthError(null);
    }
  }

  // Update profile
  async function updateProfile(updates) {
    console.log('🔄 AuthContext: updateProfile called with:', updates);
    if (!user) throw new Error('No user logged in');

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
    );

    if (Object.keys(cleanUpdates).length === 0) {
      console.log('🔄 AuthContext: No actual updates, just refetching profile');
      const profileData = await fetchProfile(user.id);
      if (profileData) setProfile(profileData);
      return profileData;
    }

    console.log('🔄 AuthContext: Updating profile in database with:', cleanUpdates);
    const { data, error } = await supabase
      .from('profiles')
      .update(cleanUpdates)
      .eq('id', user.id)
      .select('*, groups(name)');

    if (error) {
      console.error('❌ AuthContext: Profile update error:', error);
      throw error;
    }

    console.log('✅ AuthContext: Profile updated in database:', data);

    const profileData = await fetchProfile(user.id);
    if (profileData) setProfile(profileData);
    return profileData;
  }

  // Retry connection
  const retryConnection = useCallback(() => {
    setAuthError(null);
    setLoading(true);
    initDoneRef.current = false;
    window.location.reload();
  }, []);

  const value = {
    user,
    profile,
    loading,
    authError,
    signup,
    login,
    logout,
    updateProfile,
    retryConnection,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
