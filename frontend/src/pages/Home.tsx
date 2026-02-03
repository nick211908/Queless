import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading services...</div>;

    if (errorMsg) return (
        <div className="p-8 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block">
                <p className="font-bold">Connection Error</p>
                <p className="text-sm">{errorMsg}</p>
            </div>
            <p className="mt-4 text-sm text-gray-500">Check your Browser Console for details.</p>
        </div>
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">QueueLess+</h1>
            <h2 className="text-lg font-semibold mb-4">Available Services</h2>
            <div className="space-y-4">
                {services.length === 0 ? (
                    <p className="text-gray-500">No active services found. (Did you run seed.sql?)</p>
                ) : (
                    services.map(svc => (
                        <Link key={svc.id} to={`/queue/${svc.id}`} className="block p-4 border rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                            <h3 className="font-bold text-lg">{svc.name}</h3>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-500">Status: <span className="text-green-600 font-medium">{svc.status}</span></span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {svc.id.slice(0, 8)}...</span>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            <footer className="mt-12 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-400 text-sm">QueueLess+ MVP</p>
                {services.length > 0 && (
                    <Link to={`/admin/${services[0].id}`} className="text-gray-300 text-xs hover:text-gray-500 mt-2 block">
                        Admin Dashboard (Demo)
                    </Link>
                )}
            </footer>
        </div>
    );
};

export default Home;
