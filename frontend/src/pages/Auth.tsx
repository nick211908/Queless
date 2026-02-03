import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const Auth: React.FC = () => {
    const { user, profile } = useAuth(); // Get user and profile
    const navigate = useNavigate();

    useEffect(() => {
        if (user && profile) {
            if (profile.role === 'ADMIN') {
                navigate('/dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, profile, navigate]);

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Redirect based on role (fetched by Context, but we can't reliably get 'profile' effectively inside this generic function immediately after login without a small delay or just rely on the effect hook above)
                // Actually, the Effect hook in Auth.tsx (which I need to update) should handle navigation.
                // So I will REMOVE the navigate call here and let the Effect handle it.
                // navigate('/dashboard'); 
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setSuccessMsg('Account created! You can now login.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="flex justify-center items-center min-h-[80vh] p-6">
                <Card className="w-full max-w-md shadow-xl border-slate-200">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </CardTitle>
                        <CardDescription>
                            {isLogin
                                ? 'Enter your credentials to access your account'
                                : 'Sign up to start using QueueLess+'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isLogin
                                    ? 'bg-white text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isLogin
                                    ? 'bg-white text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </motion.div>
                            )}
                            {successMsg && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 bg-green-50 text-green-600 text-sm p-3 rounded-md flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {successMsg}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );
};

export default Auth;
