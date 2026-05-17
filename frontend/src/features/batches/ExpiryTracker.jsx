import { useState, useEffect } from "react";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { format, differenceInDays } from "date-fns";
import "../../styles/Expiry.css";

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

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'expired': return 'status-expired-badge';
            case 'near_expiry': return 'status-near-expiry-badge';
            default: return 'status-valid-badge';
        }
    };

    return (
        <Layout>
            {/* Toast Notification */}
            {toast && (
                <div className={`expiry-toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.type === 'success' ? (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="expiry-container">
                <div className="expiry-header-row">
                    <div>
                        <h1 className="expiry-main-title">Expiry Intelligence</h1>
                        <p className="expiry-main-desc">Real-time monitoring of chemical longevity and compliance.</p>
                    </div>

                    <div className="expiry-actions">
                        {canDelete && stats.expired > 0 && (
                            <button
                                onClick={handlePurgeAll}
                                disabled={purging}
                                className="btn-purge-expired"
                            >
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {purging ? 'Purging...' : `Purge All Expired (${stats.expired})`}
                            </button>
                        )}

                        <div className="expiry-filter-pills">
                            {[
                                { id: 'all', label: 'All Assets' },
                                { id: 'expired', label: 'Expired' },
                                { id: 'near_expiry', label: 'Near Expiry' },
                                { id: 'active', label: 'Valid' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`expiry-filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="expiry-stats-grid">
                    {[
                        { label: 'Critically Expired', value: stats.expired, color: 'red', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                        { label: 'Approaching Expiry', value: stats.near, color: 'orange', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Stable Inventory', value: stats.valid, color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
                    ].map((stat, i) => (
                        <div key={i} className={`expiry-stat-card ${stat.color}`}>
                            <div className={`expiry-stat-icon-box bg-${stat.color}-icon`}>
                                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} /></svg>
                            </div>
                            <div className="expiry-stat-info">
                                <h3 className="expiry-stat-label">{stat.label}</h3>
                                <p className={`expiry-stat-value text-${stat.color}-val`}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="expiry-ledger-card">
                    <div className="expiry-ledger-header">
                        <h2 className="expiry-ledger-title">Inventory Expiry Ledger</h2>
                        <div className="expiry-priority-badge">
                            <span className="dot-priority"></span>
                            <span className="text-priority">Priority Queue</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loader-container h-full">
                            <div className="loader-spinner h-10 w-10"></div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="empty-title">Safe Horizon</h3>
                            <p className="empty-desc">No items match your current filter.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="expiry-table">
                                <thead>
                                    <tr>
                                        <th>Substance / Identity</th>
                                        <th>Origin / Level</th>
                                        <th>Expiry Calendar</th>
                                        <th>Status / Condition</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const daysLeft = differenceInDays(new Date(item.expiryDate), new Date());
                                        const isExpired = item.status === 'expired';
                                        const isDeleting = deletingId === item.id;

                                        return (
                                            <tr key={item.id} className={isExpired ? 'expired-row' : ''}>
                                                <td data-label="Asset">
                                                    <div className="substance-identity">
                                                        <div className={`substance-avatar ${isExpired ? 'bg-expired-avatar' : 'bg-normal-avatar'}`}>
                                                            {item.chemicalId.slice(-3).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="substance-name">{item.chemicalName}</h4>
                                                            <p className="substance-ref">Ref No: {item.chemicalId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td data-label="Origin">
                                                    <div className="origin-info">
                                                        <div className="origin-pills">
                                                            <span className={`type-pill ${item.type === 'Batch' ? 'pill-batch' : 'pill-container'}`}>
                                                                {item.type}
                                                            </span>
                                                            <span className="id-text">{item.batchId || item.containerId}</span>
                                                        </div>
                                                        <p className="location-text">{item.location}</p>
                                                    </div>
                                                </td>
                                                <td data-label="Expiry">
                                                    <div className="calendar-info">
                                                        <span className={`calendar-date ${isExpired ? 'text-red-date' : 'text-normal-date'}`}>
                                                            {format(new Date(item.expiryDate), "dd MMM yyyy")}
                                                        </span>
                                                        <span className="calendar-iso">ISO: {item.expiryDate.split('T')[0]}</span>
                                                    </div>
                                                </td>
                                                <td data-label="Status">
                                                    <div className={`status-badge-wrap ${getStatusBadgeClass(item.status)}`}>
                                                        {item.status.replace(/_/g, ' ')}
                                                    </div>
                                                </td>
                                                <td data-label="Longevity">
                                                    <div className="action-cell-content">
                                                        <div className="longevity-info">
                                                            <p className={`longevity-val ${isExpired ? 'text-red-val' : daysLeft < 30 ? 'text-orange-val' : 'text-green-val'}`}>
                                                                {isExpired ? 'EXPIRED' : `${daysLeft}d`}
                                                            </p>
                                                            <span className="longevity-label">Longevity</span>
                                                        </div>

                                                        {isExpired && canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteSingle(item)}
                                                                disabled={isDeleting || purging}
                                                                className="btn-delete-expired"
                                                            >
                                                                {isDeleting ? (
                                                                    <div className="loader-spinner h-4 w-4 border-2"></div>
                                                                ) : (
                                                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

                <div className="expiry-footer-cards">
                    <div className="report-card">
                        <h2 className="report-card-title">Integrity Reporting</h2>
                        <p className="report-card-desc">
                            All expiry data is automatically synchronized across the distributed cluster. Compliance flags are triggered 30 days prior to physical expiration.
                        </p>
                        <button className="btn-dispatch">
                            Dispatch Compliance Report
                        </button>
                    </div>

                    <div className="info-card">
                        <div className="info-card-icon">
                            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="info-card-title">Automated Triggers</h3>
                            <p className="info-card-desc">
                                Email notifications and mobile push alerts are automatically dispatched for all "Near Expiry" assets.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExpiryTracker;

