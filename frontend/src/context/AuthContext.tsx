import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// Define API URL - in production this should be in env vars
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: { role: 'ADMIN' | 'USER' } | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<{ role: 'ADMIN' | 'USER' } | null>(null);
    const [loading, setLoading] = useState(true);

    const syncWithBackend = async (currentSession: Session) => {
        try {
            const response = await fetch(`${API_URL}/auth/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_token: currentSession.access_token }),
            });

            if (response.status === 401) {
                console.warn("Session invalid/expired on backend. Signing out.");
                await signOut();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Backend exchange failed:", response.status, errorText);
                return;
            }

            const data = await response.json();
            // Expected: { user: {...}, profile: { role: '...' } }
            if (data.profile) {
                setProfile(data.profile);
            }
        } catch (error) {
            console.error("Error syncing with backend:", error);
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) {
                syncWithBackend(session).then(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) {
                syncWithBackend(session);
            } else {
                setProfile(null);
            }
            if (_event === 'INITIAL_SESSION') {
                // handled by getSession usually
            } else {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out (likely already expired):", error);
        } finally {
            setProfile(null);
            setSession(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
