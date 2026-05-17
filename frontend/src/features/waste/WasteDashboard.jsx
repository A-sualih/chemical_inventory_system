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
          <div className="waste-header-info">
            <span className="waste-subtitle">Compliance & Safety Management</span>
            <h1 className="waste-title" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '-0.05em' }}>Waste & Disposal</h1>
            <p className="waste-header-desc" style={{ color: 'var(--secondary-500)', fontWeight: 600, fontSize: '1rem', maxWidth: '650px', marginTop: '0.75rem', lineHeight: 1.6 }}>
              Maintain legal standards with full regulatory audit trails, permit monitoring, and automated safety protocols for hazardous material management.
            </p>
          </div>
          <div className="waste-header-stats">
            <div className="compliance-summary-card" style={{ padding: '2rem 3rem', minWidth: '320px' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--waste-accent)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>System Status</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'white' }}>Audit Ready</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', fontWeight: 500 }}>All records are verified & signed</div>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                padding: '1rem',
                borderRadius: '1.5rem',
                fontWeight: 900,
                fontSize: '0.75rem',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                backdropFilter: 'blur(10px)',
                zIndex: 1
              }}>
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

