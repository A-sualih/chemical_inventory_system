import { useState } from 'react';
import { 
  Cloud, 
  Database, 
  Globe, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  Settings, 
  Zap, 
  Shield, 
  RefreshCcw,
  PlusCircle,
  BarChart3,
  HardDrive
} from 'lucide-react';
import Layout from '../../layout/Layout';
import './IntegrationHub.css';

const IntegrationHub = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: 'lis',
      name: 'LIS Integration',
      description: 'Connect with Laboratory Information Systems for automated test result syncing.',
      icon: <Database />,
      active: true,
      provider: 'HL7 Standard'
    },
    {
      id: 'erp',
      name: 'ERP Sync',
      description: 'Synchronize inventory procurement and financial data with SAP or Oracle.',
      icon: <Globe />,
      active: false,
      provider: 'SAP / Oracle'
    },
    {
      id: 'webhook',
      name: 'Custom Webhooks',
      description: 'Trigger external actions based on inventory threshold alerts or movements.',
      icon: <Zap />,
      active: true,
      provider: 'REST API'
    }
  ]);

  const [activeProvider, setActiveProvider] = useState('drive');

  const toggleIntegration = (id) => {
    setIntegrations(integrations.map(integ => 
      integ.id === id ? { ...integ, active: !integ.active } : integ
    ));
  };

  return (
    <Layout>
      <div className="integration-container">
        <header className="hub-header">
          <div className="hub-title">
            <h1>Connectivity Hub</h1>
            <p>Master your laboratory ecosystem with enterprise-grade API integrations and cloud data orchestration.</p>
          </div>
          <div className="storage-stats">
            <div className="stat-item">
              <span className="stat-value">84%</span>
              <span className="stat-label">API Health</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">1.2 TB</span>
              <span className="stat-label">Cloud Usage</span>
            </div>
          </div>
        </header>

        <div className="hub-grid">
          <div className="hub-main-column">
            <section className="integration-section">
              <h2 className="section-title">
                <Settings size={20} />
                API & System Integrations
              </h2>
              <div className="integration-cards-list">
                {integrations.map(integ => (
                  <div key={integ.id} className={`integration-card ${integ.active ? 'active' : ''}`}>
                    <div className="card-top">
                      <div className="integration-icon">
                        {integ.icon}
                      </div>
                      <div className="status-toggle">
                        <span>{integ.active ? 'Online' : 'Disabled'}</span>
                        <div 
                          className={`toggle-switch ${integ.active ? 'on' : ''}`}
                          onClick={() => toggleIntegration(integ.id)}
                        >
                          <div className="toggle-thumb" />
                        </div>
                      </div>
                    </div>
                    <div className="card-info">
                      <h3>{integ.name}</h3>
                      <p>{integ.description}</p>
                    </div>
                    <div className="card-footer">
                      <button className="btn-configure">Configure Endpoints</button>
                    </div>
                  </div>
                ))}
                <div className="integration-card add-new-card" style={{ borderStyle: 'dashed', background: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  <PlusCircle size={32} color="var(--secondary-300)" />
                  <p style={{ marginTop: '1rem', fontWeight: 700, color: 'var(--secondary-400)' }}>Add New Connection</p>
                </div>
              </div>
            </section>

            <section className="exchange-section">
              <div className="data-exchange-panel">
                <div className="exchange-header">
                  <h2 className="section-title" style={{ marginBottom: 0 }}>
                    <RefreshCcw size={20} />
                    Bulk Data Exchange
                  </h2>
                  <div className="exchange-meta">
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary-400)' }}>Last Sync: 12m ago</span>
                  </div>
                </div>
                
                <div className="drop-zone">
                  <Upload className="drop-icon" />
                  <div className="drop-text">
                    <h4>Drop data manifest here</h4>
                    <p>Support for .CSV, .XLSX, and .JSON datasets up to 50MB</p>
                  </div>
                </div>

                <div className="export-options">
                  <button className="export-btn">
                    <Download size={18} />
                    Export CSV
                  </button>
                  <button className="export-btn">
                    <BarChart3 size={18} />
                    Inventory Report
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="hub-sidebar">
            <section className="cloud-vault">
              <div className="vault-header">
                <div className="vault-title">
                  <h2>SDS Cloud Vault</h2>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Encrypted document synchronization</p>
                </div>
                <Shield size={24} color="#6366f1" />
              </div>

              <div className="cloud-providers">
                <div 
                  className={`provider-pill ${activeProvider === 'drive' ? 'active' : ''}`}
                  onClick={() => setActiveProvider('drive')}
                >
                  <Cloud size={20} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>Drive</span>
                </div>
                <div 
                  className={`provider-pill ${activeProvider === 'aws' ? 'active' : ''}`}
                  onClick={() => setActiveProvider('aws')}
                >
                  <HardDrive size={20} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>AWS S3</span>
                </div>
                <div 
                  className={`provider-pill ${activeProvider === 'azure' ? 'active' : ''}`}
                  onClick={() => setActiveProvider('azure')}
                >
                  <Globe size={20} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>Azure</span>
                </div>
              </div>

              <div className="sync-list">
                <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Recent Transfers</h4>
                {[
                  { name: 'Ethanol_SDS_v2.pdf', time: '2m ago', size: '1.2MB' },
                  { name: 'Lab_Asset_Registry.xlsx', time: '1h ago', size: '450KB' },
                  { name: 'Safety_Protocol_2026.docx', time: '3h ago', size: '2.1MB' }
                ].map((file, i) => (
                  <div key={i} className="sync-item">
                    <div className="file-info">
                      <FileText size={16} className="file-type-icon" />
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{file.size} • {file.time}</div>
                      </div>
                    </div>
                    <div className="sync-status">
                      <div className="syncing-dot" />
                      Synced
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-primary-glow" style={{ width: '100%', marginTop: '2rem' }}>
                Access Cloud Explorer
              </button>
            </section>

            <section className="integration-security" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} color="#22c55e" />
                Connectivity Security
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
                All API traffic is encrypted via TLS 1.3. OIDC and OAuth 2.0 protocols are enforced for third-party access.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default IntegrationHub;
