import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Building2, MapPin, Loader2, ArrowRight,
    RefreshCw,
    Trash2
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Organization {
    id: string;
    name: string;
    owner_id: string;
    role?: string;
}

interface Service {
    id: string;
    name: string;
    status: 'OPEN' | 'CLOSED';
    organization_id: string;
}

const Dashboard: React.FC = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [services, setServices] = useState<Record<string, Service[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

    // New Service Form State
    const [showNewService, setShowNewService] = useState<string | null>(null); // orgId
    const [newServiceName, setNewServiceName] = useState('');
    const [creating, setCreating] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locError, setLocError] = useState<string | null>(null);

    useEffect(() => {
        if (showNewService) {
            // Fetch location when modal opens
            setLocError(null);
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (error) => {
                        console.error("Location error:", error);
                        setLocError("Could not fetch location. Using 0,0.");
                    }
                );
            } else {
                setLocError("Geolocation not supported.");
            }
        }
    }, [showNewService]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/auth');
            return;
        }

        // Redirect non-admins to Home
        if (profile?.role !== 'ADMIN') {
            navigate('/');
            return;
        }

        fetchData();

        const channel = supabase.channel('dashboard-services')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const svc = payload.new as Service;
                    setServices(prev => ({ ...prev, [svc.organization_id]: [...(prev[svc.organization_id] || []), svc] }));
                } else if (payload.eventType === 'UPDATE') {
                    const svc = payload.new as Service;
                    setServices(prev => ({ ...prev, [svc.organization_id]: (prev[svc.organization_id] || []).map(s => s.id === svc.id ? svc : s) }));
                } else if (payload.eventType === 'DELETE') {
                    setServices(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(orgId => { next[orgId] = next[orgId].filter(s => s.id !== payload.old.id); });
                        return next;
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, profile, authLoading]);

    // I need to update the destructuring first.
    // This replace block is just checking the existing code.
    // I will replace the component start to include 'profile' and the check.

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Memberships to get Role and Organization details
            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    role,
                    organization:organizations (
                        id,
                        name,
                        owner_id
                    )
                `);

            if (error) throw error;

            if (data) {
                // Map to flat structure
                const formattedOrgs = data.map((item: any) => ({
                    id: item.organization.id,
                    name: item.organization.name,
                    owner_id: item.organization.owner_id,
                    role: item.role
                }));

                setOrgs(formattedOrgs);
                if (formattedOrgs.length > 0) {
                    toggleOrg(formattedOrgs[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching orgs:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleOrg = async (orgId: string) => {
        if (expandedOrg === orgId) {
            setExpandedOrg(null);
            return;
        }
        setExpandedOrg(orgId);

        // Fetch services for this org
        if (!services[orgId]) {
            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .eq('organization_id', orgId);

                if (error) throw error;
                if (data) {
                    setServices(prev => ({ ...prev, [orgId]: data }));
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleCreateService = async (orgId: string) => {
        if (!newServiceName.trim()) return;
        setCreating(true);
        try {
            // Create Service via Supabase (RLS requires 'OWNER' or 'ADMIN' role)
            const { data, error } = await supabase
                .from('services')
                .insert({
                    name: newServiceName,
                    latitude: location?.lat || 0,
                    longitude: location?.lng || 0,
                    status: 'CLOSED',
                    organization_id: orgId
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Create default counter
                await supabase.from('counters').insert({ service_id: data.id, name: 'Counter 1' });

                // Refresh services list
                const { data: srvData } = await supabase
                    .from('services')
                    .select('*')
                    .eq('organization_id', orgId);

                setServices(prev => ({ ...prev, [orgId]: srvData || [] }));
                setShowNewService(null);
                setNewServiceName('');
            }
        } catch (e: any) {
            alert(e.message || "Failed to create service");
        } finally {
            setCreating(false);
        }
    };

    const claimOrphans = async () => {
        if (!orgs.length) {
            alert("No organization found to claim services for.");
            return;
        }
        const orgId = orgs[0].id; // Claim for the first org

        if (!confirm("This will find all 'orphan' services (no organization) and assign them to your organization. Continue?")) return;

        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/admin/claim-orphans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organization_id: orgId })
            });
            const json = await res.json();
            if (json.success) {
                alert(json.message);
                // Refresh to show them
                fetchData();
            } else {
                throw new Error(json.message || 'Failed to claim orphans');
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-purple-600" /></div>;
    }

    return (
        <PageTransition>
            <div className="p-6 pb-20 max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground">Manage your organization and services</p>
                    </div>
                    <Button onClick={claimOrphans} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Recover Lost Services
                    </Button>
                </div>

                <div className="space-y-4">
                    {orgs.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                No organizations found. Please ask your administrator to create one.
                            </CardContent>
                        </Card>
                    ) : (
                        orgs.map(org => (
                            <motion.div key={org.id} layout transition={{ duration: 0.2 }}>
                                <Card className={`overflow-hidden transition-colors ${expandedOrg === org.id ? 'border-purple-200 bg-purple-50/30' : 'hover:border-purple-100'}`}>

                                    <div
                                        className="p-6 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleOrg(org.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-full shadow-sm text-purple-600">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg">{org.name}</h3>
                                                    {org.role && <Badge variant="outline" className="text-[10px] h-5">{org.role}</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">Owner ID: ...{org.owner_id.slice(-4)}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            {expandedOrg === org.id ? 'Hide' : 'View'}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {expandedOrg === org.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                            >
                                                <div className="px-6 pb-6 pt-0 border-t border-purple-100/50">
                                                    <div className="mt-4 flex justify-between items-center mb-4">
                                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Services</h4>
                                                        {['OWNER', 'ADMIN'].includes(org.role || '') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs h-7"
                                                                onClick={() => setShowNewService(org.id)}
                                                            >
                                                                <Plus className="w-3 h-3 mr-1" /> New Service
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {showNewService === org.id && (
                                                        <div className="mb-4 bg-white p-3 rounded-lg border shadow-sm flex flex-col gap-2">
                                                            <div className="flex justify-between items-center">
                                                                <Label>Service Name</Label>
                                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <MapPin className={`w-3 h-3 ${location ? 'text-green-500' : 'text-orange-300 animate-pulse'}`} />
                                                                    {location ?
                                                                        `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` :
                                                                        (locError || "Locating...")}
                                                                </div>
                                                            </div>
                                                            <Input
                                                                value={newServiceName}
                                                                onChange={e => setNewServiceName(e.target.value)}
                                                                placeholder="e.g. General Consultation"
                                                            />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <Button variant="ghost" size="sm" onClick={() => setShowNewService(null)}>Cancel</Button>
                                                                <Button size="sm" onClick={() => handleCreateService(org.id)} disabled={creating}>
                                                                    {creating ? 'Creating...' : 'Create'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        {services[org.id]?.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground italic">No services yet.</p>
                                                        ) : (
                                                            services[org.id]?.map(svc => (
                                                                <Card key={svc.id} className="bg-white hover:shadow-md transition-shadow">
                                                                    <div className="p-3 flex justify-between items-center">
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin className="w-4 h-4 text-slate-400" />
                                                                            <span className="font-medium text-sm">{svc.name}</span>
                                                                            <Badge variant={svc.status === 'OPEN' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5">
                                                                                {svc.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            {/* Join Queue Button (Visible to All) */}
                                                                            <Button
                                                                                size="sm"
                                                                                variant="secondary"
                                                                                className="h-8 text-xs"
                                                                                onClick={() => navigate(`/queue/${svc.id}`)}
                                                                            >
                                                                                Join
                                                                            </Button>

                                                                            {/* Manage Button (Owner/Admin Only) */}
                                                                            {['OWNER', 'ADMIN'].includes(org.role || '') && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-8 gap-1 text-xs"
                                                                                    onClick={() => navigate(`/admin/${svc.id}`)}
                                                                                >
                                                                                    Manage <ArrowRight className="w-3 h-3" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default Dashboard;
