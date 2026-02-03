import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TokenState, type Token } from '../types';

export function useQueue(serviceId: string | undefined) {
    const [token, setToken] = useState<Token | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get or Create anonymous User ID
    const getUserId = () => {
        let uid = localStorage.getItem('queless_uid');
        if (!uid) {
            uid = crypto.randomUUID();
            localStorage.setItem('queless_uid', uid);
        }
        return uid;
    };
    const userId = getUserId();

    // Initial Fetch & Subscription
    useEffect(() => {
        if (!serviceId) return;

        // 1. Fetch existing active token
        const fetchToken = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('tokens')
                .select('*')
                .eq('service_id', serviceId)
                .eq('user_identifier', userId)
                .in('state', [
                    'CREATED', 'WAITING', 'NEAR', 'CONFIRMING', 'CONFIRMED', 'CALLED', 'SERVING'
                ])
                .maybeSingle();

            if (error) {
                console.error('Fetch error:', error);
            }
            if (data) {
                setToken(data as Token);
            }
            setLoading(false);
        };

        fetchToken();

        // 2. Real-time Subscription
        const channel = supabase
            .channel('queue-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tokens',
                    filter: `service_id=eq.${serviceId}`,
                },
                (payload) => {
                    const newToken = payload.new as Token;
                    if (newToken.user_identifier === userId) {
                        setToken(newToken);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serviceId, userId]);

    // Actions
    const joinQueue = async (lat: number, long: number) => {
        setError(null);
        try {
            const { data, error: apiError } = await supabase.rpc('issue_token', {
                p_service_id: serviceId,
                p_user_id: userId
            });

            if (apiError) throw apiError;
            // We don't set token here immediately, we wait for RPC response or subscription?
            // RPC returns the token, so update state.
            if (data) setToken(data as Token);

        } catch (err: any) {
            setError(err.message || 'Failed to join queue');
        }
    };

    const confirmPresence = async (lat: number, long: number) => {
        setError(null);
        if (!token) return;

        // Call backend API (FastAPI) or RPC directly? 
        // We implemented `verify` endpoint in FastAPI `routers/presence.py` which does Logic + RPC.
        // Ideally we call FastAPI. But for simplicity in this MVP without proxy setup, we can attempt RPC or standard fetch.
        // However, `verify_presence` has logic (Geo check) in Python. 
        // If we call RPC `confirm_token` directly, we skip Geo check!
        // So we MUST call FastAPI.
        // Assuming FastAPI is at localhost:8000.

        try {
            const res = await fetch('http://localhost:8000/api/v1/presence/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token_id: token.id,
                    lat,
                    long
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail || 'Verification failed');

            if (json.success === false) {
                throw new Error(json.message || 'Verification rejected by server.');
            }

            // Success! Manually refresh signal to ensure UI updates immediately
            const { data } = await supabase.from('tokens').select('*').eq('id', token.id).single();
            if (data) setToken(data as Token);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return {
        token,
        loading,
        error,
        userId,
        joinQueue,
        confirmPresence
    };
}
