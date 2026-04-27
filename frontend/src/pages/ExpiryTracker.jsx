import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";
import { format, differenceInDays } from "date-fns";

const ExpiryTracker = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [stats, setStats] = useState({ expired: 0, near: 0, valid: 0 });
    const [deletingId, setDeletingId] = useState(null);
    const [purging, setPurging] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: '' }

    const { hasPermission } = useAuth();
    const canDelete = hasPermission("delete_chemical");

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchExpiryData = async () => {
        setLoading(true);
        try {
            const endpoint = statusFilter === "all" ? "/api/expiry/summary" : `/api/expiry/summary?status=${statusFilter}`;
            const { data } = await axios.get(endpoint);
            setItems(data);

            if (statusFilter === "all") {
                const s = { expired: 0, near: 0, valid: 0 };
                data.forEach(item => {
                    if (item.status === 'expired') s.expired++;
                    else if (item.status === 'near_expiry') s.near++;
                    else s.valid++;
                });
                setStats(s);
            }
        } catch (err) {
            console.error("Failed to fetch expiry data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpiryData();
    }, [statusFilter]);

    // Delete a single expired record
    const handleDeleteSingle = async (item) => {
        if (!window.confirm(`Permanently delete this expired ${item.type.toLowerCase()} (${item.batchId || item.containerId})? This cannot be undone.`)) return;
        setDeletingId(item.id);
        try {
            const type = item.type === 'Batch' ? 'batch' : 'container';
            const { data } = await axios.delete(`/api/expiry/${type}/${item.id}`);
            showToast('success', `${item.type} deleted.${data.chemicalDeleted ? ' Parent chemical record also removed (orphaned).' : ''}`);
            fetchExpiryData();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to delete record.');
        } finally {
            setDeletingId(null);
        }
    };

    // Bulk purge ALL expired
    const handlePurgeAll = async () => {
        if (!window.confirm(`⚠️ This will permanently delete ALL ${stats.expired} expired batches and containers, and any parent chemicals that only had expired stock.\n\nThis action is irreversible. Proceed?`)) return;
        setPurging(true);
        try {
            const { data } = await axios.delete('/api/expiry/purge-expired');
            showToast('success', `Purge complete: ${data.deletedBatches} batches, ${data.deletedContainers} containers, ${data.deletedChemicals} chemicals removed.`);
            fetchExpiryData();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Purge failed.');
        } finally {
            setPurging(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'expired': return 'bg-red-500 text-white border-red-600 shadow-red-200';
            case 'near_expiry': return 'bg-orange-500 text-white border-orange-600 shadow-orange-200';
            default: return 'bg-green-500 text-white border-green-600 shadow-green-200';
        }
    };

    const expiredItems = items.filter(i => i.status === 'expired');

    return (
        <Layout>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold transition-all animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? (
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span className="max-w-xs">{toast.msg}</span>
                </div>
            )}

            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black heading-font text-secondary-950 tracking-tight">Expiry Intelligence</h1>
                    <p className="text-secondary-500 font-medium mt-1">Real-time monitoring of chemical longevity and compliance.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Purge All Expired — only shown when there are expired items and user has permission */}
                    {canDelete && stats.expired > 0 && (
                        <button
                            onClick={handlePurgeAll}
                            disabled={purging}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/30 transition-all active:scale-95 disabled:opacity-60"
                        >
                            {purging ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            )}
                            Purge All Expired ({stats.expired})
                        </button>
                    )}

                    <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-3xl border border-secondary-100 shadow-xl overflow-x-auto">
                        {[
                            { id: 'all', label: 'All Assets' },
                            { id: 'expired', label: 'Expired' },
                            { id: 'near_expiry', label: 'Near Expiry' },
                            { id: 'active', label: 'Valid' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === tab.id ? 'bg-secondary-900 text-white shadow-lg' : 'text-secondary-400 hover:text-secondary-900'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                    { label: 'Critically Expired', value: stats.expired, color: 'red', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                    { label: 'Approaching Expiry', value: stats.near, color: 'orange', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: 'Stable Inventory', value: stats.valid, color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-8 rounded-[2.5rem] border border-${stat.color}-100 shadow-2xl shadow-${stat.color}-900/5 relative overflow-hidden group`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700`}></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} /></svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest leading-none mb-2">{stat.label}</h3>
                                <p className={`text-4xl font-black text-${stat.color}-600 leading-none`}>{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                    <h2 className="text-xl font-black text-secondary-900 heading-font">Inventory Expiry Ledger</h2>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-secondary-200 rounded-full"></span>
                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em]">Priority Queue</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <div className="w-12 h-12 border-4 border-secondary-200 border-t-primary-600 rounded-full animate-spin"></div>
                        <p className="mt-4 text-[10px] font-black text-secondary-400 uppercase tracking-[0.3em]">Calibrating Chronology...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-24 h-24 bg-secondary-50 rounded-full flex items-center justify-center mb-6 text-secondary-200">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-secondary-900 mb-2">Safe Horizon</h3>
                        <p className="text-secondary-500 max-w-xs mx-auto text-sm">No items match your current filter. Your inventory is clear of these conditions.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50/50">
                                <tr className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] border-b border-secondary-100">
                                    <th className="px-8 py-5">Substance / Identity</th>
                                    <th className="px-8 py-5">Origin / Level</th>
                                    <th className="px-8 py-5">Expiry Calendar</th>
                                    <th className="px-8 py-5">Status / Condition</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {items.map((item, idx) => {
                                    const daysLeft = differenceInDays(new Date(item.expiryDate), new Date());
                                    const isExpired = item.status === 'expired';
                                    const isDeleting = deletingId === item.id;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`group hover:bg-secondary-50/50 transition-colors ${isExpired ? 'bg-red-50/20' : ''}`}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-110 transition-transform ${isExpired ? 'bg-red-600' : 'bg-secondary-900'}`}>
                                                        {item.chemicalId.slice(-3).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-secondary-900 text-base leading-tight truncate">{item.chemicalName}</h4>
                                                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mt-1">Ref No: {item.chemicalId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.type === 'Batch' ? 'bg-primary-50 text-primary-600 border border-primary-100' : 'bg-secondary-50 text-secondary-600 border border-secondary-100'}`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="text-xs font-bold text-secondary-700">{item.batchId || item.containerId}</span>
                                                    </div>
                                                    <p className="text-[10px] text-secondary-400 font-medium italic">{item.location}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-black ${isExpired ? 'text-red-500' : 'text-secondary-900'}`}>
                                                        {format(new Date(item.expiryDate), "dd MMM yyyy")}
                                                    </span>
                                                    <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest mt-1">ISO: {item.expiryDate.split('T')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border w-fit shadow-sm ${getStatusColor(item.status)}`}>
                                                    {item.status.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-3">
                                                    {/* Days remaining badge */}
                                                    <div className="text-right">
                                                        <p className={`text-lg font-black leading-none ${isExpired ? 'text-red-600' : daysLeft < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                                                            {isExpired ? 'EXPIRED' : `${daysLeft}d`}
                                                        </p>
                                                        <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mt-1 block">Longevity</span>
                                                    </div>

                                                    {/* Delete button — only for expired items and authorized users */}
                                                    {isExpired && canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteSingle(item)}
                                                            disabled={isDeleting || purging}
                                                            title="Delete this expired record"
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white border border-red-100 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                                        >
                                                            {isDeleting ? (
                                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bottom info cards */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-secondary-950 p-10 rounded-[3rem] text-white shadow-3xl shadow-secondary-900/40 relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-600/10 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black heading-font mb-4">Integrity Reporting</h2>
                        <p className="text-secondary-400 text-sm font-medium leading-relaxed mb-8 max-w-md">
                            All expiry data is automatically synchronized across the distributed cluster. Compliance flags are triggered 30 days prior to physical expiration.
                        </p>
                        <button className="px-8 py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-900/40 active:scale-95 transition-all">
                            Dispatch Compliance Report
                        </button>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-secondary-100 shadow-2xl flex items-center gap-8 group">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 shrink-0 group-hover:rotate-12 transition-transform">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-black heading-font text-secondary-900 mb-2">Automated Triggers</h3>
                        <p className="text-secondary-500 text-sm font-medium leading-relaxed italic">
                            Email notifications and mobile push alerts are automatically dispatched for all "Near Expiry" assets.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExpiryTracker;
