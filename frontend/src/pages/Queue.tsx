import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../hooks/useQueue';
import QRCode from 'react-qr-code';
import { TokenState } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/PageTransition';
import { MapPin, CheckCircle2, Bell, Scan, PartyPopper } from 'lucide-react';

const Queue: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const { token, loading, error, joinQueue, confirmPresence } = useQueue(serviceId);
    const [locating, setLocating] = useState(false);

    const handleJoin = () => {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                joinQueue(pos.coords.latitude, pos.coords.longitude);
                setLocating(false);
            },
            (_err) => {
                alert('Location access required to join.');
                setLocating(false);
            }
        );
    };

    const handleVerify = () => {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                confirmPresence(pos.coords.latitude, pos.coords.longitude);
                setLocating(false);
            },
            (_err) => {
                alert('Location access required to verify.');
                setLocating(false);
            }
        );
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <motion.div
                    className="flex flex-col items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading queue state...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="p-6 min-h-screen flex flex-col items-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
                >
                    Queue Status
                </motion.h1>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full mb-4"
                        >
                            <Card className="border-destructive/50 bg-destructive/5">
                                <CardContent className="pt-6">
                                    <p className="text-destructive text-center">{error}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!token ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md"
                    >
                        <Card className="border-primary/20">
                            <CardHeader className="text-center">
                                <CardTitle>Ready to Join?</CardTitle>
                                <CardDescription>
                                    Start your virtual queue experience
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <MapPin className="w-16 h-16 text-muted-foreground" />
                                <p className="text-center text-muted-foreground">
                                    We'll need your location to add you to the queue
                                </p>
                                <Button
                                    onClick={handleJoin}
                                    disabled={locating}
                                    size="lg"
                                    className="w-full"
                                >
                                    {locating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Locating...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Join Queue
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="w-full max-w-md space-y-6">
                        {/* Token Number Display */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                            <Card className="border-primary/50">
                                <CardContent className="pt-8 pb-8">
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-2">Your Token</p>
                                        <motion.div
                                            className="text-7xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            #{token.token_number}
                                        </motion.div>
                                        <div className="mt-4">
                                            <Badge variant="secondary" className="text-base px-4 py-1">
                                                {token.state}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* State-specific cards */}
                        <AnimatePresence mode="wait">
                            {token.state === TokenState.WAITING && (
                                <motion.div
                                    key="waiting"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <Card className="border-yellow-500/50 bg-yellow-50/50">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-yellow-700">
                                                <Bell className="w-5 h-5" />
                                                Waiting Remotely
                                            </CardTitle>
                                            <CardDescription>
                                                Make your way to the location when ready
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                onClick={handleVerify}
                                                disabled={locating}
                                                variant="default"
                                                className="w-full bg-yellow-500 hover:bg-yellow-600"
                                            >
                                                {locating ? 'Verifying...' : "I'm Here (Verify)"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {token.state === TokenState.NEAR && (
                                <motion.div
                                    key="near"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <Card className="border-orange-500/50 bg-orange-50/50 animate-pulse">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-orange-700">
                                                <Bell className="w-5 h-5 animate-bounce" />
                                                You're Near the Front!
                                            </CardTitle>
                                            <CardDescription>
                                                Confirm your presence to proceed
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                onClick={handleVerify}
                                                className="w-full bg-orange-500 hover:bg-orange-600"
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Confirm Presence
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {token.state === TokenState.CONFIRMED && (
                                <motion.div
                                    key="confirmed"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <Card className="border-green-500/50 bg-green-50/50">
                                        <CardContent className="pt-6 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                            <p className="font-bold text-green-700 text-lg">Confirmed!</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Please wait for your number to be called
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {token.state === TokenState.CALLED && (
                                <motion.div
                                    key="called"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <Card className="border-green-500 border-2 shadow-lg">
                                        <CardHeader className="text-center">
                                            <CardTitle className="text-green-700 text-2xl flex items-center justify-center gap-2">
                                                <PartyPopper className="w-6 h-6" />
                                                Go to Counter!
                                            </CardTitle>
                                            <CardDescription>
                                                Show this QR code to the agent
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center">
                                            <motion.div
                                                className="bg-white p-4 rounded-lg"
                                                animate={{ scale: [1, 1.02, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <QRCode value={token.id} size={200} />
                                            </motion.div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {token.state === TokenState.SERVING && (
                                <motion.div
                                    key="serving"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <Card className="border-blue-500/50 bg-blue-50/50">
                                        <CardHeader className="text-center">
                                            <CardTitle className="text-blue-700 text-xl">Now Serving...</CardTitle>
                                            <CardDescription>
                                                When done, scan the Exit QR at the desk
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center gap-3">
                                            <Scan className="w-16 h-16 text-blue-500" />
                                            <p className="text-xs text-muted-foreground">
                                                (Scanner integration would go here)
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {token.state === TokenState.DONE && (
                                <motion.div
                                    key="done"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <Card className="border-gray-300 bg-gray-50">
                                        <CardContent className="pt-6 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                            <p className="font-bold text-gray-700 text-lg">Service Completed</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Thank you for using QueueLess+!
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default Queue;
