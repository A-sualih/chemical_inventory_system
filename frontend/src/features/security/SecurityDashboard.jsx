import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheckIcon, 
  ArchiveBoxIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  KeyIcon,
  CloudArrowUpIcon,
  ClockIcon,
  FingerPrintIcon
} from '@heroicons/react/24/outline';
import Sidebar from '../../layout/Sidebar';

const SecurityDashboard = () => {
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [error, setError] = useState(null);

  const fetchSecurityData = async () => {
    try {
      const [statusRes, backupsRes] = await Promise.all([
        axios.get('/api/security/status'),
        axios.get('/api/security/backups')
      ]);
      setStatus(statusRes.data);
      setBackups(backupsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch security metrics');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await axios.post('/api/security/backups');
      await fetchSecurityData();
      alert('System backup completed successfully.');
    } catch (err) {
      alert('Backup failed: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (fileName) => {
    if (!window.confirm(`WARNING: You are about to restore the system from backup: ${fileName}. This will overwrite all current data. Continue?`)) return;
    
    setRestoring(fileName);
    try {
      await axios.post('/api/security/restore', { fileName });
      alert('System restored successfully. The application will now reload.');
      window.location.reload();
    } catch (err) {
      alert('Restore failed: ' + err.message);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading security protocols...</div>;

  return (
    <div className="flex h-screen bg-[#0a0f18] text-slate-200">
      <Sidebar active="security" />
      
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Security & Backup Center</h1>
            <p className="text-slate-400 mt-1">Manage system integrity, access controls, and disaster recovery.</p>
          </div>
          
          <button 
            onClick={handleBackup}
            disabled={backingUp}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              backingUp ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
            }`}
          >
            {backingUp ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CloudArrowUpIcon className="w-5 h-5" />}
            {backingUp ? 'Creating Backup...' : 'Create Manual Backup'}
          </button>
        </header>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ShieldCheckIcon className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-slate-400 text-sm font-medium">System Health</span>
            </div>
            <div className="text-2xl font-bold text-white">Secure</div>
            <div className="text-green-500 text-xs mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Real-time protection active
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <FingerPrintIcon className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-slate-400 text-sm font-medium">MFA Adoption</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(status?.mfaRatio || 0)}%</div>
            <div className="text-slate-500 text-xs mt-1">Users with MFA enabled</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Locked Accounts</span>
            </div>
            <div className="text-2xl font-bold text-white">{status?.lockedUsers || 0}</div>
            <div className="text-slate-500 text-xs mt-1">Due to failed attempts</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <ArchiveBoxIcon className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-slate-400 text-sm font-medium">Available Backups</span>
            </div>
            <div className="text-2xl font-bold text-white">{status?.backups || 0}</div>
            <div className="text-slate-500 text-xs mt-1">
              Last: {status?.lastBackup ? new Date(status.lastBackup).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Backup History */}
          <section className="lg:col-span-2">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArchiveBoxIcon className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-lg">System Restore Points</h2>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4">Backup Name</th>
                      <th className="px-6 py-4">Created On</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {backups.map((b) => (
                      <tr key={b.fileName} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-blue-400">{b.fileName}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-slate-500" />
                            {new Date(b.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRestore(b.fileName)}
                            disabled={restoring}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50`}
                          >
                            {restoring === b.fileName ? 'Restoring...' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                          No backup files found. Automated backups are scheduled daily.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Side Panels */}
          <div className="space-y-8">
            {/* Audit Logs Preview */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <KeyIcon className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold">Recent Security Activity</h2>
              </div>
              <div className="space-y-4">
                {status?.recentAudit.map((log) => (
                  <div key={log._id} className="border-l-2 border-slate-700 pl-4 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white">{log.action}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{log.details}</p>
                    <div className="text-[10px] text-slate-500 mt-1">by {log.user.name}</div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all">
                View All Activity Logs
              </button>
            </div>

            {/* Recovery Protocols */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 border-l-4 border-l-blue-500">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-500" />
                Disaster Recovery
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                System backups include all chemical records, user credentials, audit trails, and document links. 
                Restoration points are stored in a compressed, encrypted format.
              </p>
              <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-[11px] text-blue-300">
                <strong>Notice:</strong> Automatic snapshots are created every night at 02:00 UTC.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SecurityDashboard;
