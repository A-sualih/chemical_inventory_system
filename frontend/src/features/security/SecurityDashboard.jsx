import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheckIcon, 
  ArchiveBoxIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  KeyIcon,
  CloudArrowUpIcon,
  ClockIcon,
  FingerPrintIcon
} from '@heroicons/react/24/outline';
import Layout from '../../layout/Layout';
import '../../styles/Security.css';

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

  if (loading) return (
    <Layout>
      <div className="loading-view">
        <div className="spinner-danger"></div>
        <div className="loading-text-danger">Loading security protocols...</div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="security-dashboard-container">
        <header className="security-header">
          <div>
            <h1 className="security-header-title">Security & <span>Backup</span></h1>
            <p className="security-header-subtitle">Manage system integrity, access controls, and disaster recovery.</p>
          </div>
          
          <button 
            onClick={handleBackup}
            disabled={backingUp}
            className="backup-action-btn"
          >
            {backingUp ? <ArrowPathIcon className="icon-nav spin" /> : <CloudArrowUpIcon className="icon-nav" />}
            {backingUp ? 'Creating Backup...' : 'Create Manual Backup'}
          </button>
        </header>

        {/* Top Metrics */}
        <div className="security-metrics-grid">
          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-icon-box icon-green">
                <ShieldCheckIcon className="icon-nav" />
              </div>
              <span className="metric-label">System Health</span>
            </div>
            <div className="metric-value">Secure</div>
            <div className="metric-footer" style={{ color: '#4ade80' }}>
              <span className="pulse-dot" />
              Real-time protection active
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-icon-box icon-blue">
                <FingerPrintIcon className="icon-nav" />
              </div>
              <span className="metric-label">MFA Adoption</span>
            </div>
            <div className="metric-value">{Math.round(status?.mfaRatio || 0)}%</div>
            <div className="metric-footer">Users with MFA enabled</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-icon-box icon-orange">
                <ExclamationTriangleIcon className="icon-nav" />
              </div>
              <span className="metric-label">Locked Accounts</span>
            </div>
            <div className="metric-value">{status?.lockedUsers || 0}</div>
            <div className="metric-footer">Due to failed attempts</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-icon-box icon-purple">
                <ArchiveBoxIcon className="icon-nav" />
              </div>
              <span className="metric-label">Available Backups</span>
            </div>
            <div className="metric-value">{status?.backups || 0}</div>
            <div className="metric-footer">
              Last: {status?.lastBackup ? new Date(status.lastBackup).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="security-main-grid">
          {/* Backup History */}
          <section className="dashboard-section">
            <div className="section-header">
              <ArchiveBoxIcon className="icon-nav" style={{ color: '#3b82f6' }} />
              <h2 className="section-title">System Restore Points</h2>
            </div>
            
            <div className="restore-table-container">
              <table className="restore-table">
                <thead className="table-head">
                  <tr>
                    <th>Backup Name</th>
                    <th>Created On</th>
                    <th>Size</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.fileName} className="table-row">
                      <td className="backup-name-cell">{b.fileName}</td>
                      <td className="timestamp-cell">
                        <ClockIcon style={{ width: '1rem' }} />
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--secondary-400)' }}>{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleRestore(b.fileName)}
                          disabled={restoring}
                          className="restore-btn"
                        >
                          {restoring === b.fileName ? 'Restoring...' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--secondary-500)', fontStyle: 'italic' }}>
                        No backup files found. Automated backups are scheduled daily.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Side Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Audit Logs Preview */}
            <div className="dashboard-section" style={{ paddingBottom: '1.5rem' }}>
              <div className="section-header">
                <KeyIcon className="icon-nav" style={{ color: '#fb923c' }} />
                <h2 className="section-title">Recent Security Activity</h2>
              </div>
              <div className="activity-list">
                {status?.recentAudit.map((log) => (
                  <div key={log._id} className="activity-item">
                    <div className="activity-item-header">
                      <span className="activity-action">{log.action}</span>
                      <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="activity-details">{log.details}</p>
                    <div className="activity-user">by {log.user.name}</div>
                  </div>
                ))}
              </div>
              <button style={{ margin: '0 1.5rem', width: 'calc(100% - 3rem)', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                View All Activity Logs
              </button>
            </div>

            {/* Recovery Protocols */}
            <div className="protocol-box">
              <div className="protocol-title-flex">
                <ArrowPathIcon className="icon-nav" style={{ color: '#3b82f6' }} />
                <span>Disaster Recovery</span>
              </div>
              <p className="protocol-text">
                System backups include all chemical records, user credentials, audit trails, and document links. 
                Restoration points are stored in a compressed format.
              </p>
              <div className="notice-badge">
                <strong>Notice:</strong> Automatic snapshots are created every night at 02:00 UTC.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SecurityDashboard;
