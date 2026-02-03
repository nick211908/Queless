import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import { ArrowRight, Sparkles, Lock } from 'lucide-react';

const Home: React.FC = () => {
    const { user, profile } = useAuth();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchServices() {
            try {
                // Check if env vars are set
                if (import.meta.env.VITE_SUPABASE_URL?.includes('your-project')) {
                    throw new Error('Please update .env with your real Supabase URL!');
                }

                const { data, error } = await supabase.from('services').select('*').eq('status', 'OPEN');
                if (error) throw error;
                if (data) setServices(data);
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message || 'Failed to load services.');
            } finally {
                setLoading(false);
            }
        }
        fetchServices();
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                {/* Hero skeleton */}
                <div className="space-y-3">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-64" />
                </div>

                {/* Service card skeletons */}
                <div className="space-y-4 mt-8">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <PageTransition>
                <div className="p-8 flex items-center justify-center min-h-screen">
                    <Card className="border-destructive/50 bg-destructive/5 max-w-md">
                        <CardHeader>
                            <CardTitle className="text-destructive">Connection Error</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{errorMsg}</p>
                            <p className="text-xs text-muted-foreground">Check your Browser Console for details.</p>
                        </CardContent>
                    </Card>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="p-6 pb-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 relative"
                >
                    <div className="absolute right-0 top-0 flex gap-2">
                        {user ? (
                            <>
                                {profile?.role === 'ADMIN' && (
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-primary hover:text-primary/80">
                                        Dashboard
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-destructive">
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground hover:text-primary">
                                <Lock className="w-4 h-4 mr-2" />
                                Admin Login
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mb-2 pt-2">
                        <Sparkles className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            QueueLess+
                        </h1>
                    </div>
                    <p className="text-muted-foreground">Skip the wait, embrace convenience</p>
                </motion.div>

                {/* Services Section */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        Available Services
                        <Badge variant="secondary">{services.length}</Badge>
                    </h2>
                </div>

                {/* Service Cards */}
                <div className="space-y-4">
                    {services.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground text-center">
                                    No active services found. (Did you run seed.sql?)
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        services.map((svc, index) => (
                            <motion.div
                                key={svc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    ease: [0.6, -0.05, 0.01, 0.99]
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link to={`/queue/${svc.id}`}>
                                    <Card className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden relative">
                                        {/* Gradient accent */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />

                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                                    {svc.name}
                                                </CardTitle>
                                                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Status:</span>
                                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                        {svc.status}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                                    {svc.id.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-12 pt-6 border-t border-border text-center space-y-2"
                >
                    <p className="text-muted-foreground text-sm">QueueLess+ MVP</p>
                    {/* Only show direct Admin link if logged in as Admin */}
                    {user && profile?.role === 'ADMIN' && services.length > 0 && (
                        <Link
                            to={`/admin/${services[0].id}`}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-block"
                        >
                            Manage Service (Quick Access)
                        </Link>
                    )}
                </motion.footer>
            </div>
        </PageTransition>
    );
};

export default Home;
