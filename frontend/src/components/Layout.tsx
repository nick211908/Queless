import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-0 -right-4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Glass container */}
            <main className="max-w-md mx-auto min-h-screen relative">
                <div className="min-h-screen bg-white/40 backdrop-blur-md shadow-2xl border-x border-white/20 relative overflow-hidden flex flex-col">
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/30 pointer-events-none" />

                    {/* Header */}
                    <div className="relative z-20 px-6 py-4 flex justify-between items-center border-b border-white/30">
                        <Link to={user ? "/dashboard" : "/"} className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            QueueLess+
                        </Link>
                        <div className="flex items-center gap-2">
                            {user ? (
                                <>
                                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-2">
                                        <UserIcon className="w-3 h-3" />
                                        {user.email?.split('@')[0]}
                                    </div>
                                    <Button onClick={handleLogout} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive">
                                        <LogOut className="w-4 h-4 mr-1" />
                                        Logout
                                    </Button>
                                </>
                            ) : (
                                <Link to="/auth">
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                        <LogIn className="w-4 h-4 mr-1" />
                                        Login
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex-1 overflow-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
