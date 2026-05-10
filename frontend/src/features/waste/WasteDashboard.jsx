import React, { useState } from 'react';
import DisposalLogTab from './DisposalLogTab';
import ComplianceTab from './ComplianceTab';
import SafetyIncidentsTab from './SafetyIncidentsTab';
import WasteAnalyticsTab from './WasteAnalyticsTab';
import { IconTrash, IconFileText, IconAlertTriangle, IconBarChart } from './WasteIcons';
import Layout from '../../layout/Layout';
import './Waste.css';

const TABS = [
  { id: 'disposal', label: 'Disposal Records', Icon: IconTrash },
  { id: 'compliance', label: 'Regulatory Compliance', Icon: IconFileText },
  { id: 'safety', label: 'Safety & Incidents', Icon: IconAlertTriangle },
  { id: 'analytics', label: 'Analytics', Icon: IconBarChart }
];

export default function WasteDashboard() {
  const [activeTab, setActiveTab] = useState('disposal');
  const [showDisposalModal, setShowDisposalModal] = useState(false);

  return (
    <Layout>
      <div className="waste-container">
        <header className="waste-header">
          <div>
            <span className="waste-subtitle">Compliance & Safety Management</span>
            <h1 className="waste-title">Waste & Disposal</h1>
            <p style={{ color: 'var(--secondary-500)', fontWeight: 500, fontSize: '0.9375rem' }}>
              Track, approve, and manage hazardous waste disposal with full regulatory audit trails.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div className="compliance-summary-card" style={{ padding: '1.5rem 2rem', marginBottom: 0, minWidth: '350px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--waste-accent)', marginBottom: '0.25rem' }}>System Status</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Audit Ready</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>All disposal logs are digitally signed</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '0.75rem', borderRadius: '1rem', fontWeight: 900, fontSize: '0.75rem' }}>
                100% SECURE
              </div>
            </div>
          </div>
        </header>

        <nav className="waste-tabs">
          {TABS.map(tab => {
            const { Icon } = tab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`waste-tab ${activeTab === tab.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="waste-content">
          {activeTab === 'disposal' && (
            <DisposalLogTab 
              externalShowModal={showDisposalModal} 
              onCloseModal={() => setShowDisposalModal(false)} 
              onOpenModal={() => setShowDisposalModal(true)}
            />
          )}
          {activeTab === 'compliance' && <ComplianceTab />}
          {activeTab === 'safety' && <SafetyIncidentsTab />}
          {activeTab === 'analytics' && <WasteAnalyticsTab />}
        </main>
      </div>
    </Layout>
  );
}
