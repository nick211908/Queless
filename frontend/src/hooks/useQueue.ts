import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { type Token } from '../types';
import { useAuth } from '../context/AuthContext';

export function useQueue(serviceId: string | undefined) {
    const { user } = useAuth();
    const userId = user?.id; // Authenticated User ID

    const [token, setToken] = useState<Token | null>(null);
    const [queueTokens, setQueueTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial Fetch & Subscription
    useEffect(() => {
        if (!serviceId) return;

        // 1. Fetch ALL active tokens (including mine and others)
        const fetchTokens = async () => {
            setLoading(true);
            try {
                // Fetch context: Who is WAITING, SERVING, etc.
                const { data, error } = await supabase
                    .from('tokens')
                    .select('*')
                    .eq('service_id', serviceId)
                    .in('state', [
                        'WAITING', 'NEAR', 'CONFIRMED', 'CALLED', 'SERVING'
                    ])
                    .order('token_number', { ascending: true });

                if (error) throw error;

                if (data) {
                    setQueueTokens(data as Token[]);

                    // Find my token in the list
                    if (userId) {
                        const myToken = data.find((t: Token) => t.user_identifier === userId);
                        if (myToken) {
                            setToken(myToken);
                        } else {
                            // If not in the active list (e.g. state is CREATED or DONE, or just not loaded?),
                            // try fetching specifically for me.
                            const { data: myData } = await supabase
                                .from('tokens')
                                .select('*')
                                .eq('service_id', serviceId)
                                .eq('user_identifier', userId)
                                .maybeSingle();
                            if (myData) setToken(myData as Token);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTokens();

        // 2. Real-time Subscription for Queue Updates
        const channel = supabase
            .channel('queue-global-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tokens',
                    filter: `service_id=eq.${serviceId}`,
                },
                (payload) => {
                    const newRecord = payload.new as Token;
                    const oldRecord = payload.old as Token;
                    const eventType = payload.eventType;

                    // Update Array Logic
                    setQueueTokens(prev => {
                        let next = [...prev];

                        if (eventType === 'INSERT') {
                            if (['WAITING', 'NEAR', 'CONFIRMED', 'CALLED', 'SERVING'].includes(newRecord.state)) {
                                next.push(newRecord);
                            }
                        } else if (eventType === 'UPDATE') {
                            // If new state is invalid, remove it. Else update.
                            const isActive = ['WAITING', 'NEAR', 'CONFIRMED', 'CALLED', 'SERVING'].includes(newRecord.state);
                            if (!isActive) {
                                next = next.filter(t => t.id !== newRecord.id);
                            } else {
                                const idx = next.findIndex(t => t.id === newRecord.id);
                                if (idx !== -1) next[idx] = newRecord;
                                else next.push(newRecord);
                            }
                        } else if (eventType === 'DELETE') {
                            next = next.filter(t => t.id !== oldRecord.id);
                        }

                        // Maintain Sort
                        return next.sort((a, b) => a.token_number - b.token_number);
                    });

                    // Update My Token Logic
                    if (userId) {
                        if (newRecord && newRecord.user_identifier === userId) {
                            setToken(newRecord);
                        } else if (eventType === 'DELETE' && oldRecord.id === token?.id) {
                            setToken(null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serviceId, userId]); // Re-run if user logs in/out

    // Calculate People Ahead
    // Logic: My Index in the ACTIVE list.
    // If I am waiting, and there are 5 people active ahead of me.
    let peopleAhead = -1;
    if (token && queueTokens.length > 0) {
        // Only count if I'm in the list
        const idx = queueTokens.findIndex(t => t.id === token.id);
        if (idx !== -1) {
            peopleAhead = idx; // 0 means I am at the front (or serving)
        }
    }

    // Actions
    const joinQueue = async (_lat: number, _long: number) => {
        setError(null);
        if (!userId) {
            setError("You must be logged in to join the queue.");
            return;
        }

        try {
            const { data, error: apiError } = await supabase.rpc('issue_token', {
                p_service_id: serviceId
                // p_user_id removed, handled by auth context in backend
            });

            if (apiError) throw apiError;
            // RPC returns the token
            if (data) setToken(data as Token);
        } catch (err: any) {
            setError(err.message || 'Failed to join queue');
        }
    };

    const confirmPresence = async (lat: number, long: number) => {
        setError(null);
        if (!token) return;
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
            // Important: Check OK response
            if (!res.ok) {
                const detail = json.detail || 'Verification request failed';
                throw new Error(detail);
            }

            if (json.success === false) {
                // Logic rejected it (e.g. too far)
                throw new Error(json.message || 'Verification rejected by server.');
            }

            // Success! Refresh
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
        confirmPresence,
        queueTokens,
        peopleAhead
    };
}
