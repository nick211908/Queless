import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../hooks/useQueue';
import QRCode from 'react-qr-code';
import { TokenState } from '../types';

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
            (err) => {
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
            (err) => {
                alert('Location access required to verify.');
                setLocating(false);
            }
        );
    };

    if (loading) return <div className="p-8 text-center">Loading state...</div>;

    return (
        <div className="p-6 flex flex-col items-center space-y-6">
            <h1 className="text-2xl font-bold">Queue Status</h1>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded block w-full text-center">{error}</div>}

            {!token ? (
                <div className="text-center">
                    <p className="mb-4">You are not in the queue.</p>
                    <button
                        onClick={handleJoin}
                        disabled={locating}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                        {locating ? 'Locating...' : 'Join Queue'}
                    </button>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center">
                    <div className="text-6xl font-black text-blue-600 mb-2">#{token.token_number}</div>
                    <div className="text-xl font-medium text-gray-700 mb-6">Status: {token.state}</div>

                    {/* STATE SPECIFIC UI */}

                    {token.state === TokenState.WAITING && (
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p>You are waiting remotely.</p>
                            <p className="text-sm text-gray-500 mt-2">Make your way to the location.</p>
                            {/* Optional: 'I am here' manual trigger if geo-fencing is proactive */}
                            <button
                                onClick={handleVerify}
                                disabled={locating}
                                className="mt-4 bg-yellow-400 text-black px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {locating ? 'Verifying...' : "I'm Here (Verify)"}
                            </button>
                        </div>
                    )}

                    {token.state === TokenState.NEAR && (
                        <div className="text-center p-4 bg-orange-50 rounded-lg animate-pulse">
                            <p className="font-bold">You are near the front!</p>
                            <button
                                onClick={handleVerify}
                                className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg font-bold"
                            >
                                Confirm Presence
                            </button>
                        </div>
                    )}

                    {token.state === TokenState.CONFIRMED && (
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-green-700 font-bold">Confirmed!</p>
                            <p>Please wait for your number to be called.</p>
                        </div>
                    )}

                    {token.state === TokenState.CALLED && (
                        <div className="flex flex-col items-center bg-white p-4 border-2 border-green-500 rounded-xl shadow-lg">
                            <p className="font-bold text-lg mb-2 text-green-700">Go to Counter!</p>
                            <p className="text-sm text-gray-500 mb-4">Show this QR to the agent.</p>
                            {/* Used Token ID as QR Content for Entry */}
                            <QRCode value={token.id} size={200} />
                        </div>
                    )}

                    {token.state === TokenState.SERVING && (
                        <div className="text-center p-4">
                            <p className="text-blue-700 font-bold text-xl">Now Serving...</p>
                            <p className="text-gray-500 mb-4">When done, scan the Exit QR at the desk.</p>
                            {/* User Scans Desk QR (Exit) */}
                            {/* We need a scanner here */}
                            <div className="bg-gray-100 p-4 rounded">
                                <p>Scan Exit QR on Desk</p>
                                {/* Scanner Component Placeholder - For MVP assume button/mock or implement scanner */}
                                <p className="text-xs text-gray-400 mt-2">(Scanner integration would go here)</p>
                            </div>
                        </div>
                    )}

                    {token.state === TokenState.DONE && (
                        <div className="text-center p-4 bg-gray-100 rounded-lg">
                            <p className="text-gray-700 font-bold">Service Completed.</p>
                            <p className="text-sm text-gray-500">Thank you!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Queue;
