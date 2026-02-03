import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Service, Token } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition';
import {
    Play,
    Pause,
    Megaphone,
    Trash2,
    Users,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Admin: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const [service, setService] = useState<Service | null>(null);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [calling, setCalling] = useState(false);

    // Hardcoded Counter ID for MVP (Admin represents Counter 1)
    const [counterId, setCounterId] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            if (!serviceId) return;
            try {
                // 1. Get Service
                const { data: svc, error: svcErr } = await supabase.from('services').select('*').eq('id', serviceId).maybeSingle();
                if (svcErr) throw svcErr;
                if (!svc) {
                    setErrorMsg("Service not found. Check the ID in the URL.");
                    setLoading(false);
                    return;
                }
                setService(svc);

                // 2. Get Counter (Pick first free one or create dummy)
                const { data: counters } = await supabase.from('counters').select('*').eq('service_id', serviceId).limit(1);
                if (counters && counters.length > 0) {
                    setCounterId(counters[0].id);
                }

                // 3. Get Active Tokens
                fetchTokens();
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        }
        init();

        // Realtime Subs
        const channel = supabase.channel('admin-view').on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `service_id=eq.${serviceId}` }, () => {
            fetchTokens();
        }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [serviceId]);

    const fetchTokens = async () => {
        const { data } = await supabase.from('tokens').select('*')
            .eq('service_id', serviceId)
            .in('state', ['WAITING', 'NEAR', 'CONFIRMED', 'CALLED', 'SERVING'])
            .order('token_number', { ascending: true });
        if (data) setTokens(data as Token[]);
    };

    const callNext = async () => {
        if (!counterId) return alert('No counter found');
        setCalling(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/admin/call-next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_id: serviceId, counter_id: counterId })
            });
            const json = await res.json();
            if (!json.success) alert(json.message);
        } catch (e: any) {
            alert('Error calling next: ' + e.message);
        } finally {
            setCalling(false);
        }
    };

    const cancelToken = async (id: string) => {
        if (!confirm('Cancel this token using standard JS confirm?')) return;
        await fetch('http://localhost:8000/api/v1/admin/cancel-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_id: id })
        });
    };

    const toggleService = async () => {
        if (!service) return;
        const newStatus = service.status === 'OPEN' ? 'CLOSED' : 'OPEN';

        try {
            const res = await fetch('http://localhost:8000/api/v1/admin/toggle-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_id: serviceId, status: newStatus })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to toggle service');
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.message || 'Backend reported failure');
            }

            // Only update local state on success
            setService(prev => prev ? { ...prev, status: newStatus as any } : null);
        } catch (err: any) {
            console.error('Toggle service error:', err);
            alert(`Failed to update service status: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </div>
        );
    }

    if (errorMsg) return (
        <PageTransition>
            <div className="p-8 flex justify-center">
                <Card className="max-w-md border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Error Accessing Admin
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-2">{errorMsg}</p>
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">Service ID: {serviceId}</p>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );

    const activeToken = tokens.find(t => t.state === 'CALLED' || t.state === 'SERVING');
    const waitingTokens = tokens.filter(t => t.state !== 'CALLED' && t.state !== 'SERVING');

    return (
        <PageTransition>
            <div className="p-6 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Admin Console
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            {service?.name}
                            <Badge variant={service?.status === 'OPEN' ? 'default' : 'secondary'} className={service?.status === 'OPEN' ? 'bg-green-500' : ''}>
                                {service?.status}
                            </Badge>
                        </p>
                    </div>
                    {service && (
                        <Button
                            onClick={toggleService}
                            variant={service.status === 'OPEN' ? 'destructive' : 'default'}
                            className="gap-2"
                        >
                            {service.status === 'OPEN' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {service.status === 'OPEN' ? 'Pause Service' : 'Resume Service'}
                        </Button>
                    )}
                </div>

                <div className="grid gap-8">
                    {/* Main Action Area */}
                    <Card className="border-indigo-100 shadow-lg bg-gradient-to-br from-white to-indigo-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-indigo-600" />
                                Controls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center gap-4">
                                {activeToken ? (
                                    <div className="text-center w-full bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
                                        <p className="text-sm text-muted-foreground">Currently Serving</p>
                                        <div className="text-6xl font-black text-indigo-600 my-2">#{activeToken.token_number}</div>
                                        <Badge variant="outline" className="text-lg py-1 px-4">{activeToken.state}</Badge>
                                        <div className="mt-6 flex justify-center gap-4">
                                            <Button variant="outline" onClick={() => callNext()} disabled={calling}>
                                                Call Next
                                            </Button>
                                            <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => cancelToken(activeToken.id)}>
                                                Cancel/Skip
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={callNext}
                                        disabled={calling || tokens.length === 0}
                                        size="lg"
                                        className="w-full h-24 text-2xl font-bold rounded-xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        {calling ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                                Calling...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Megaphone className="w-8 h-8" />
                                                CALL NEXT
                                            </div>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Check Queue List */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Waiting Queue
                            <Badge variant="secondary" className="ml-2">{waitingTokens.length}</Badge>
                        </h2>

                        <div className="space-y-3">
                            <AnimatePresence initial={false}>
                                {waitingTokens.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                                            <p className="text-muted-foreground">Queue is empty</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    waitingTokens.map(t => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Card className="hover:border-primary/30 transition-colors">
                                                <CardContent className="p-4 flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-2xl font-bold tabular-nums text-foreground/80">
                                                            #{t.token_number}
                                                        </span>
                                                        <Badge
                                                            variant={t.state === 'CONFIRMED' ? 'default' : 'secondary'}
                                                            className={cn(
                                                                t.state === 'CONFIRMED' ? 'bg-green-500 hover:bg-green-600' : '',
                                                                t.state === 'NEAR' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''
                                                            )}
                                                        >
                                                            {t.state}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => cancelToken(t.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Admin;
