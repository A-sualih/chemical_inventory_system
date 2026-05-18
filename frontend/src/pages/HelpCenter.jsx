import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  HelpCircle, 
  ShieldAlert, 
  Video, 
  Wrench,
  Search,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import '../styles/HelpCenter.css';

const HelpCenter = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable FAQ state
  const [openFaqs, setOpenFaqs] = useState({});
  const [openGuides, setOpenGuides] = useState({});

  const toggleFaq = (idx) => {
    setOpenFaqs(prev => ({...prev, [idx]: !prev[idx]}));
  };

  const toggleGuide = (idx) => {
    setOpenGuides(prev => ({...prev, [idx]: !prev[idx]}));
  };

  const categories = [
    { id: 'overview', title: 'Overview', desc: 'All help topics', icon: <BookOpen size={18} /> },
    { id: 'getting_started', title: 'Getting Started', desc: 'System basics', icon: <BookOpen size={18} /> },
    { id: 'chemical_management', title: 'Chemical Management', desc: 'Inventory & batches', icon: <BookOpen size={18} /> },
    { id: 'scanner_help', title: 'Scanner Help', desc: 'QR & Barcode usage', icon: <Wrench size={18} /> },
    { id: 'disposal_requests', title: 'Disposal Requests', desc: 'Waste & compliance', icon: <ShieldAlert size={18} /> },
    { id: 'reports_pdfs', title: 'Reports & PDFs', desc: 'Data exports', icon: <BookOpen size={18} /> },
    { id: 'account_settings', title: 'Account Settings', desc: 'Profile & preferences', icon: <Wrench size={18} /> },
    { id: 'emergency_support', title: 'Emergency Support', desc: 'Immediate assistance', icon: <ShieldAlert size={18} color="#ef4444" /> }
  ];

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'getting_started':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>What Help Center Means</h2>
              <p>
                It helps users learn how to use the system, how to solve common problems, 
                and how to manage chemicals safely.
              </p>
            </div>

            <div className="help-content-section" id="faq">
              <h3><HelpCircle size={24} className="section-icon" /> FAQ (Frequently Asked Questions)</h3>
              <div className="faq-accordion">
                {[
                  { q: 'How do I reset my password?', a: 'Click on "Forgot Password" on the login page and follow the email instructions.' },
                  { q: 'Why is a chemical marked expired?', a: 'The system automatically flags chemicals past their logged expiration date to prevent safety hazards.' }
                ].map((faq, idx) => (
                  <div key={`faq1-${idx}`} className={`faq-row ${openFaqs[`faq1-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleFaq(`faq1-${idx}`)}>
                      <span>Q: {faq.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{faq.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="help-content-section" id="videos">
              <h3><Video size={24} className="section-icon" /> Video Tutorials</h3>
              <p className="coming-soon-text">You can later add short tutorials, demo videos, and walkthroughs here.</p>
              <div className="video-placeholders">
                <div className="video-placeholder">
                   <Video size={32} opacity={0.5} />
                   <span>System Overview (Coming Soon)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'chemical_management':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Chemical Management</h2>
              <p>
                Learn how to effectively add, track, and monitor the lifecycle of chemical containers within your laboratory ecosystem.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> User Guides</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'How to Add Chemicals',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Open the Inventory or Chemicals page.</li>
                        <li>Click <strong>Add Chemical</strong>.</li>
                        <li>Enter chemical information such as: Chemical name, CAS number, Formula, Quantity and unit, Storage location, Supplier information, and Expiry date.</li>
                        <li>Upload the SDS (Safety Data Sheet) PDF if available.</li>
                        <li>Assign the chemical to a batch or container if needed.</li>
                        <li>Click <strong>Save</strong> to register the chemical in the system.</li>
                      </ol>
                    )
                  },
                  {
                    q: 'How to Check In / Check Out Chemicals',
                    a: (
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Check In</h5>
                        <p style={{ margin: '0 0 0.5rem 0' }}><em>Used when adding or returning chemicals to storage.</em></p>
                        <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                          <li>Scan or search for the chemical/container.</li>
                          <li>Click <strong>Check In</strong>.</li>
                          <li>Enter: Quantity added, Storage location, and Notes or reason.</li>
                          <li>Confirm the operation. Inventory quantity updates automatically.</li>
                        </ol>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Check Out</h5>
                        <p style={{ margin: '0 0 0.5rem 0' }}><em>Used when chemicals are taken for experiments or use.</em></p>
                        <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                          <li>Scan or search for the chemical/container.</li>
                          <li>Click <strong>Check Out</strong>.</li>
                          <li>Enter: Quantity removed, Experiment or purpose, and Department or user.</li>
                          <li>Confirm the request. The system records the activity in the inventory log and updates stock levels.</li>
                        </ol>
                      </div>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide1-${idx}`} className={`faq-row ${openGuides[`guide1-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide1-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="help-content-section" id="safety">
              <h3><ShieldAlert size={24} className="section-icon text-red" /> Safety Instructions</h3>
              <div className="safety-cards">
                <div className="safety-card">
                  <h4>Chemical handling rules</h4>
                  <p>Always review the SDS before handling and ensure incompatible classes are separated.</p>
                </div>
                <div className="safety-card">
                  <h4>Hazard labels meaning</h4>
                  <p>Reference GHS pictograms and the NFPA diamond in the SDS tab for accurate hazard levels.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'scanner_help':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Scanner Help</h2>
              <p>
                Master the Quick Scan capabilities to instantly identify chemical containers, check inventory statuses, and securely check items in or out of your facility.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> User Guides</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'How to Scan QR / Barcodes',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Open the Scanner or Quick Scan feature.</li>
                        <li>Allow camera access if prompted.</li>
                        <li>Point the camera toward the QR code or barcode.</li>
                        <li>The system automatically identifies the chemical or container.</li>
                        <li>Chemical details, stock status, and location will appear instantly. You can then: View details, Check in/out, Update quantity, Transfer inventory, or Open SDS files.</li>
                      </ol>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide2-${idx}`} className={`faq-row ${openGuides[`guide2-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide2-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="help-content-section" id="troubleshooting">
              <h3><Wrench size={24} className="section-icon" /> Troubleshooting</h3>
              <ul className="guide-list troubleshooting">
                <li><strong>Scanner not working:</strong> Ensure your browser has camera permissions active.</li>
                <li><strong>QR code not detected:</strong> Improve lighting, tap to focus, and hold camera steady.</li>
              </ul>
            </div>
          </div>
        );

      case 'disposal_requests':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Disposal Requests</h2>
              <p>
                Ensure compliance by properly routing expired, depleted, or unwanted chemicals through the hazardous waste disposal queue.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> User Guides</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'How to Dispose Chemicals',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Open the Disposal Management page.</li>
                        <li>Select the chemical or container for disposal.</li>
                        <li>Enter disposal details: Quantity, Disposal reason, Disposal method, and Compliance notes.</li>
                        <li>Review the SDS disposal instructions and complete the required safety checklist.</li>
                        <li>Submit for approval if required by the lab or safety manager. After approval, inventory is updated, disposal logs are recorded, audit history is maintained, and compliance records are stored.</li>
                      </ol>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide3-${idx}`} className={`faq-row ${openGuides[`guide3-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide3-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'reports_pdfs':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Reports & PDFs</h2>
              <p>
                A comprehensive guide to generating exportable data tables and compliance audit trails across the entire organization.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> User Guides</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'How to Generate Reports',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Open the Reports or Analytics section.</li>
                        <li>Select the report type (Inventory, Expiry, Disposal, Audit, Low stock, or Transfer).</li>
                        <li>Apply filters such as Lab, Date range, Chemical type, or Status.</li>
                        <li>Click <strong>Generate Report</strong>.</li>
                        <li>View, download, or print the report in formats like PDF or Excel.</li>
                      </ol>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide4-${idx}`} className={`faq-row ${openGuides[`guide4-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide4-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="help-content-section" id="troubleshooting">
              <h3><Wrench size={24} className="section-icon" /> Troubleshooting</h3>
              <ul className="guide-list troubleshooting">
                <li><strong>PDF not downloading:</strong> Check pop-up blocker settings or try regenerating.</li>
              </ul>
            </div>
          </div>
        );

      case 'account_settings':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Account Settings</h2>
              <p>
                Manage your credentials, active laboratories, multi-factor authentication (MFA), and personal notification preferences.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> User Guides</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'How to Update Profile and Credentials',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Navigate to <strong>Account Settings</strong> from your user profile menu.</li>
                        <li>Update fields such as email, phone number, and password.</li>
                        <li>Review your assigned roles and laboratory affiliations to ensure they are up to date.</li>
                        <li>Click <strong>Save Changes</strong> to apply your updates system-wide.</li>
                      </ol>
                    )
                  },
                  {
                    q: 'Managing Notification Preferences',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Go to the <strong>Notifications</strong> tab in your settings dashboard.</li>
                        <li>Toggle email alerts for low inventory warnings, upcoming expiries, and transfer requests.</li>
                        <li>Save your changes to customize how often the system contacts you.</li>
                      </ol>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide5-${idx}`} className={`faq-row ${openGuides[`guide5-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide5-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="help-content-section" id="troubleshooting">
              <h3><Wrench size={24} className="section-icon" /> Troubleshooting</h3>
              <ul className="guide-list troubleshooting">
                <li><strong>Login issue:</strong> Ensure credentials are correct and you are assigned to an active lab.</li>
              </ul>
            </div>
          </div>
        );

      case 'emergency_support':
        return (
          <div className="help-content-wrapper">
            <div className="help-intro">
              <h2>Emergency Support</h2>
              <p>
                Critical documentation regarding institutional safety protocols, spill mitigation steps, and emergency contact numbers.
              </p>
            </div>
            <div className="help-content-section">
              <h3><BookOpen size={24} className="section-icon" /> Emergency Procedures</h3>
              <div className="faq-accordion">
                {[
                  {
                    q: 'What to Do in Case of a Chemical Spill',
                    a: (
                      <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li><strong>Evacuate:</strong> Move personnel away from the immediate spill area.</li>
                        <li><strong>Identify:</strong> Review the Safety Data Sheet (SDS) via the system to evaluate hazards.</li>
                        <li><strong>Report:</strong> Contact Environmental Health and Safety (EHS) immediately.</li>
                        <li><strong>Mitigate:</strong> Only use authorized spill kits if you are trained and equipped to do so safely.</li>
                      </ol>
                    )
                  },
                  {
                    q: 'Emergency Contacts',
                    a: (
                      <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                        <li><strong>Campus Security / Police:</strong> 911 or internal emergency number</li>
                        <li><strong>Environmental Health & Safety (EHS):</strong> See local EHS contact directory</li>
                        <li><strong>Facilities Management:</strong> Contact for ventilation or structural emergencies</li>
                      </ul>
                    )
                  }
                ].map((guide, idx) => (
                  <div key={`guide6-${idx}`} className={`faq-row ${openGuides[`guide6-${idx}`] ? 'open' : ''}`}>
                    <div className="faq-question" onClick={() => toggleGuide(`guide6-${idx}`)}>
                      <span>{guide.q}</span>
                      <ChevronDown size={18} className="faq-chevron" />
                    </div>
                    <div className="faq-answer">
                      <div style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{guide.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="help-content-section" id="safety">
              <h3><ShieldAlert size={24} className="section-icon text-red" /> Safety Instructions</h3>
              <div className="safety-cards">
                <div className="safety-card">
                  <h4>PPE requirements</h4>
                  <p>Goggles, lab coats, and appropriate gloves are mandatory in all active use areas.</p>
                </div>
                <div className="safety-card">
                  <h4>Spill response steps</h4>
                  <p>Evacuate, isolate, and refer to Emergency Oversight for cleanup protocols.</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderContent = () => {
    if (activeSection === 'overview') {
      return (
        <div className="help-overview-container">
          {categories.filter(c => c.id !== 'overview').map(cat => (
            <div key={cat.id} className="overview-section-block" style={{ marginBottom: '4rem', paddingBottom: '2rem', borderBottom: '2px dashed #cbd5e1' }}>
              {renderSectionContent(cat.id)}
            </div>
          ))}
        </div>
      );
    }
    return renderSectionContent(activeSection);
  };

  return (
    <div className="help-center-layout">
      {/* Header */}
      <header className="help-header">
        <div className="container help-header-inner">
          <div className="header-brand">
             <Link to="/" className="back-link-help">← Back</Link>
             <h1>Help <span>Center</span></h1>
          </div>
          <div className="help-search">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search guides, FAQs, troubleshooting..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container help-main">
        {/* Sidebar Navigation */}
        <aside className="help-sidebar">
          <h3>Structure Categories</h3>
          <ul>
            {categories.map(cat => (
              <li 
                key={cat.id} 
                className={activeSection === cat.id ? 'active' : ''}
                onClick={() => setActiveSection(cat.id)}
                style={{ alignItems: 'flex-start', padding: '1rem' }}
              >
                <div style={{ marginTop: '2px' }}>{cat.icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{cat.title}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px', fontWeight: 400 }}>{cat.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Area */}
        <main className="help-content">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default HelpCenter;
