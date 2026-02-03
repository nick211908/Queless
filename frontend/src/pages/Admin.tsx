import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Service, Token } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition';
import QRScanner from '@/components/QRScanner';
import {
    Play,
    Pause,
    Megaphone,
    Trash2,
    Users,
    AlertCircle,
    Scan,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Admin: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [service, setService] = useState<Service | null>(null);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [calling, setCalling] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    // QR Scanning State
    const [scanMode, setScanMode] = useState(false);
    const [processingScan, setProcessingScan] = useState(false);

    // Hardcoded Counter ID for MVP (Admin represents Counter 1)
    const [counterId, setCounterId] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            if (!serviceId) return;
            if (authLoading) return; // Wait for auth check
            if (!user) return;       // Will redirect via other effect

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

                // 2. Get Counter via Backend (ensures existence and bypasses Client RLS issues)
                try {
                    const counterRes = await fetch('http://localhost:8000/api/v1/admin/ensure-counter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ service_id: serviceId })
                    });
                    const counterJson = await counterRes.json();
                    if (counterJson.success && counterJson.counter) {
                        setCounterId(counterJson.counter.id);
                    } else {
                        console.error("Failed to ensure counter:", counterJson);
                    }
                } catch (cErr) {
                    console.error("Network error ensuring counter:", cErr);
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
        const channel = supabase.channel('admin-view')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `service_id=eq.${serviceId}` }, () => {
                fetchTokens();
            })
            // Add Service Subscription
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'services', filter: `id=eq.${serviceId}` }, (payload) => {
                console.log("Service update received:", payload);
                if (payload.new) {
                    setService(payload.new as Service);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [serviceId, user, authLoading]);

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
        console.log("Toggling service:", service.id, "Current Status:", service.status);
        const newStatus = service.status === 'OPEN' ? 'CLOSED' : 'OPEN';

        try {
            const res = await fetch('http://localhost:8000/api/v1/admin/toggle-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_id: serviceId, status: newStatus })
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Backend Error:", errorData);
                throw new Error(errorData.detail || 'Failed to toggle service');
            }

            const json = await res.json();
            console.log("Toggle Response:", json);
            if (!json.success) {
                throw new Error(json.message || 'Backend reported failure');
            }

            // Update local state immediately with returned data
            if (json.data && json.data.length > 0) {
                setService(json.data[0] as Service);
            } else {
                // Fallback if data not returned (though it should be)
                setService(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (err: any) {
            console.error('Toggle service error:', err);
            alert(`Failed to update service status: ${err.message}`);
        }
    };

    const handleQRScan = async (scannedText: string) => {
        if (processingScan) return;
        setProcessingScan(true);

        try {
            // Assume scannedText is the token UUID
            const res = await fetch('http://localhost:8000/api/v1/admin/complete-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token_id: scannedText })
            });

            const json = await res.json();
            if (json.success) {
                // Success!
                setScanMode(false);
                // Optional: Show success toast/alert
                alert(`User #${json.token.token_number} cleared successfully!`);
            } else {
                alert(`Error: ${json.message}`);
            }
        } catch (err: any) {
            alert("Scan processing failed: " + err.message);
        } finally {
            setProcessingScan(false);
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
                {/* QR Scanner Modal */}
                {scanMode && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-md"
                        >
                            <Card className="relative overflow-hidden">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 z-10 hover:bg-slate-100 rounded-full"
                                    onClick={() => setScanMode(false)}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                                <CardHeader className="text-center pb-2">
                                    <CardTitle>Scan User QR</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-slate-50 rounded-lg p-1">
                                        <QRScanner
                                            onResult={handleQRScan}
                                            onError={(err) => console.log(err)}
                                        />
                                    </div>
                                    <p className="text-center text-sm text-muted-foreground mt-4">
                                        Scan the QR code on the user's screen to complete their service.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Admin Console
                        </h1>
                        <div className="text-muted-foreground flex items-center gap-2 mt-1">
                            {service?.name}
                            <Badge variant={service?.status === 'OPEN' ? 'default' : 'secondary'} className={service?.status === 'OPEN' ? 'bg-green-500' : ''}>
                                {service?.status}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setScanMode(true)}
                            variant="outline"
                            className="gap-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700"
                        >
                            <Scan className="w-4 h-4" />
                            Scan User
                        </Button>
                        {service && (
                            <Button
                                onClick={toggleService}
                                variant={service.status === 'OPEN' ? 'destructive' : 'default'}
                                className="gap-2"
                            >
                                {service.status === 'OPEN' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {service.status === 'OPEN' ? 'Pause' : 'Resume'}
                            </Button>
                        )}
                    </div>
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
                                    <div className="text-center w-full bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
                                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Currently Serving</p>
                                        <div className="text-7xl font-black text-indigo-600 my-4 tracking-tighter">#{activeToken.token_number}</div>
                                        <Badge variant="outline" className="text-lg py-1 px-6 border-indigo-200 text-indigo-700 bg-indigo-50 mb-6">{activeToken.state}</Badge>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Button
                                                onClick={() => setScanMode(true)}
                                                size="lg"
                                                className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-lg"
                                            >
                                                <Scan className="w-4 h-4 mr-2" />
                                                Finish (Scan)
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                                onClick={() => cancelToken(activeToken.id)}
                                            >
                                                Skip / Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={callNext}
                                        disabled={calling || tokens.length === 0}
                                        size="lg"
                                        className="w-full h-24 text-2xl font-bold rounded-xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
