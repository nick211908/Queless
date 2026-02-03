import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Service, Token } from '../types';

const Admin: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const [service, setService] = useState<Service | null>(null);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        }
    };

    const cancelToken = async (id: string) => {
        if (!confirm('Cancel this token?')) return;
        await fetch('http://localhost:8000/api/v1/admin/cancel-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_id: id })
        });
    };

    const toggleService = async () => {
        const newStatus = service?.status === 'OPEN' ? 'CLOSED' : 'OPEN';
        await fetch('http://localhost:8000/api/v1/admin/toggle-service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service_id: serviceId, status: newStatus })
        });
        setService(prev => prev ? { ...prev, status: newStatus as any } : null);
    };

    if (loading) return <div className="p-8">Loading Admin...</div>;

    if (errorMsg) return (
        <div className="p-8 text-center">
            <div className="text-red-500 font-bold text-xl mb-2">Error</div>
            <p>{errorMsg}</p>
            <p className="mt-4 text-gray-500 text-sm">Service ID: {serviceId}</p>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                {service && (
                    <button
                        onClick={toggleService}
                        className={`px-4 py-2 rounded text-white font-bold ${service.status === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`}
                    >
                        {service.status === 'OPEN' ? 'Pause Service' : 'Resume Service'}
                    </button>
                )}
            </div>

            <div className="mb-8">
                <button
                    onClick={callNext}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg hover:bg-blue-700"
                >
                    CALL NEXT
                </button>
            </div>

            <h2 className="text-lg font-semibold mb-3">Queue List</h2>
            <div className="space-y-2">
                {tokens.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                        <div>
                            <span className="text-xl font-black mr-3">#{t.token_number}</span>
                            <span className={`text-sm px-2 py-1 rounded ${t.state === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                {t.state}
                            </span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => cancelToken(t.id)}
                                className="text-red-500 text-sm hover:underline"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {tokens.length === 0 && <p className="text-gray-500">Queue is empty.</p>}
            </div>
        </div>
    );
};

export default Admin;
