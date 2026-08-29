import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';
import { 
  Package, 
  ShieldCheck, 
  QrCode, 
  Activity, 
  Trash2, 
  ClipboardList, 
  Bell, 
  FlaskConical,
  Building,
  HelpCircle,
  PhoneCall,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  Users,
  Database,
  Lock,
  Layers,
  ArrowUpRight,
  Smartphone,
  Download,
  ExternalLink,
  CheckCircle,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import '../styles/Landing.css';
import ThemeToggle from '../components/common/ThemeToggle';

const MOBILE_APP_BUILD_URL = "https://expo.dev/accounts/chemical-inventory-system/projects/chemical-inventory-system/builds/b90d39c0-9c35-4299-a331-3064120739e8";

const Landing = () => {
  const { user } = useAuth();
  const { settings, settingsLoaded } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDevModal, setShowDevModal] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [stats, setStats] = React.useState({
    chemicalsTracked: '...',
    activeLabs: '...',
    vesselsManaged: '...',
    safetyCompliance: '...'
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/public/stats');
        if (res.data && res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch landing stats', err);
      }
    };
    fetchStats();
  }, []);

  // Return visitors from Privacy/Terms/Support to the footer, not the hero
  React.useEffect(() => {
    const hash = location.hash?.replace('#', '');
    if (!hash) return;

    const scrollToHash = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Wait a tick so landing layout/stats paint first
    const t = window.setTimeout(scrollToHash, 50);
    return () => window.clearTimeout(t);
  }, [location.hash, location.key]);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const systemName = settings?.systemName || "CIMS PRO";
  const systemLogo = settings?.systemLogo;
  const orgName = settings?.orgName || "Managed Stack";
  const heroSrc = settings?.landingHero
    || (settingsLoaded ? "/landing_hero_illustration_v2_1779104886985.png" : null);
  return (
    <div className="landing-container">
      {/* Background Decor */}
      <div className="landing-blob blob-1"></div>
      <div className="landing-blob blob-2"></div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          {systemLogo ? (
            <img src={systemLogo} alt="Logo" style={{ height: '32px', width: 'auto', borderRadius: '6px' }} />
          ) : settingsLoaded ? (
            <FlaskConical size={26} />
          ) : (
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--secondary-100, #e2e8f0)' }} aria-hidden />
          )}
          <div className="nav-title-text">
            <span className="nav-title-primary">Chemical</span>
            <span className="nav-title-secondary">Inventory System</span>
          </div>
        </div>

        <div className="nav-mobile-right">
          <ThemeToggle />
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#mobile-app" className="nav-link highlight-nav-link" onClick={() => setMobileMenuOpen(false)}>
            <Smartphone size={14} className="inline mr-1" /> Mobile App
          </a>
          <a href="#about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#workflow" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
          <div className="nav-desktop-theme">
            <ThemeToggle />
          </div>
          {user ? (
            <Link to="/dashboard" className="btn-nav-login" onClick={() => setMobileMenuOpen(false)}>
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-nav-login" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1>{systemName}</h1>
          <p className="hero-description">
            A secure multi-lab platform for tracking chemicals, containers, safety compliance, 
            inventory movement, and disposal workflows with enterprise-grade precision in {orgName}.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-hero-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn-hero-primary">Create Account</Link>
                <Link to="/login" className="btn-hero-secondary">Sign In</Link>
              </>
            )}
            <a
              href={MOBILE_APP_BUILD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-secondary btn-hero-mobile"
            >
              <Smartphone size={18} /> Download Mobile App
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-img-container">
             {heroSrc ? (
               <img
                 src={heroSrc}
                 alt={`${systemName} Illustration`}
                 onError={(e) => { e.target.src = "/landing_hero_illustration_v2_1779104886985.png"; }}
               />
             ) : (
               <div aria-hidden style={{ width: '100%', minHeight: 220, borderRadius: 16, background: 'var(--secondary-100, #e2e8f0)' }} />
             )}
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div className="stats-strip">
        <div className="stat-item">
          <span className="stat-value">{stats.chemicalsTracked}+</span>
          <span className="stat-label">Chemicals Tracked</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.activeLabs}</span>
          <span className="stat-label">Active Laboratories</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.vesselsManaged}+</span>
          <span className="stat-label">Vessels Managed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.safetyCompliance}</span>
          <span className="stat-label">Safety Compliance</span>
        </div>
      </div>

      {/* Key Features Section */}
      <section id="features" className="section-container features-section">
        <span className="section-tag">Powerful Capabilities</span>
        <h2 className="section-title">Everything you need for precise control</h2>
        <div className="features-grid">
          <FeatureCard 
            icon={<Package size={24} />}
            title="Inventory Tracking"
            desc="Real-time monitoring of chemicals, containers, batches, and precise quantities across all labs."
          />
          <FeatureCard 
            icon={<Layers size={24} />}
            title="Multi-Lab Management"
            desc="Secure siloed management for multiple departments under one centralized institutional platform."
          />
          <FeatureCard 
            icon={<QrCode size={24} />}
            title="QR / Barcode Scanning"
            desc="Instant identification and movement tracking using high-speed barcode scanning integration."
          />
          <FeatureCard 
            icon={<ShieldCheck size={24} />}
            title="Safety & SDS Management"
            desc="Centralized SDS repository with hazard classification (GHS) and NFPA visual diamond reporting."
          />
          <FeatureCard 
            icon={<Trash2 size={24} />}
            title="Disposal Workflow"
            desc="End-to-end hazardous waste management with approval queues and compliance audit trails."
          />
          <FeatureCard 
            icon={<ClipboardList size={24} />}
            title="Audit & Activity Logs"
            desc="Comprehensive ledger tracking every change, movement, and adjustment for regulatory compliance."
          />
          <FeatureCard 
            icon={<Bell size={24} />}
            title="Notifications & Alerts"
            desc="Automated warnings for chemical expiry, low-stock levels, and critical safety threshold breaches."
          />
        </div>
      </section>

      {/* --- Dedicated Mobile App Banner Section --- */}
      <section id="mobile-app" className="section-container mobile-app-section">
        <div className="mobile-app-card">
          <div className="mobile-app-content">
            <span className="section-tag section-tag-left">Take {systemName} On The Go</span>
            <h2 className="mobile-app-title">Download the {systemName} Native Mobile App</h2>
            <p className="mobile-app-desc">
              Perform chemical check-ins, scan container QR/barcodes on physical lab shelves, receive instant expiry alerts, and submit usage requests directly from your mobile device.
            </p>
            
            <div className="mobile-features-list">
              <div className="mobile-feature-item">
                <div className="mobile-feature-icon">
                  <QrCode size={18} />
                </div>
                <span><strong>Instant QR & Barcode Scanning</strong> for fast shelf inventory management</span>
              </div>
              <div className="mobile-feature-item">
                <div className="mobile-feature-icon">
                  <Bell size={18} />
                </div>
                <span><strong>Live Expiry & Low-Stock Push Alerts</strong> tailored to your lab assignments</span>
              </div>
              <div className="mobile-feature-item">
                <div className="mobile-feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <span><strong>Secure Chunked Session Storage</strong> & Multi-Factor authentication persistence</span>
              </div>
            </div>

            <div className="mobile-app-actions">
              <a 
                href={MOBILE_APP_BUILD_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-download-app-primary"
              >
                <Download size={20} /> Download Mobile Build (EAS) <ExternalLink size={14} style={{ opacity: 0.8 }} />
              </a>
              <span className="build-badge">
                <CheckCircle size={14} style={{ color: '#10b981' }} /> Official Expo Android & iOS Artifact
              </span>
            </div>
          </div>

          <div className="mobile-app-visual">
            <div className="phone-mockup-frame">
              <div className="phone-notch"></div>
              <div className="phone-screen-content">
                <div className="phone-app-header">
                  <Smartphone size={24} />
                  <span>CIMS Mobile</span>
                </div>
                <div className="phone-scan-graphic">
                  <QrCode size={64} className="text-accent" />
                  <p>Scan Container Barcode</p>
                </div>
                <div className="phone-status-pill">
                  <CheckCircle size={14} /> Mobile App Active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section-container">
        <div className="about-section">
          <div className="about-visual">
             <Database size={80} color="var(--landing-teal)" style={{ opacity: 0.5 }} />
          </div>
          <div className="about-content">
             <span className="section-tag section-tag-left">Our Mission</span>
             <h2>Instituting Digital Safety in Science</h2>
             <p>
                {systemName} was developed to bridge the gap between 
                complex laboratory operations and digital oversight. Our mission is to eliminate 
                manual tracking errors and minimize hazards through intelligent automation.
             </p>
             <p>
                By providing institutional-wide visibility, {systemName} helps safety officers and 
                lab managers maintain a zero-incident environment while optimizing procurement.
             </p>
             <Link to="/learn-more" className="btn-hero-secondary btn-about-tech">Learn More About Our Tech</Link>
          </div>
        </div>
      </section>

      {/* Safety & Compliance Section */}
      <section className="section-container safety-compliance-section">
        <div className="safety-compliance-box">
          <ShieldAlert size={54} color="#ef4444" className="safety-alert-icon" />
          <h2 className="section-title">Compliance is not optional</h2>
          <p className="hero-description safety-description">
            Built to exceed safety standards, {systemName} integrates with GHS protocols and provides 
            real-time hazard analysis for every storage location in your facility.
          </p>
          <div className="roles-container">
             <div className="role-box role-box-danger">
                <h4>SDS Integration</h4>
                <p>Digital access to safety sheets at the point of use.</p>
             </div>
             <div className="role-box role-box-warning">
                <h4>Hazard Tracking</h4>
                <p>Automatic classification of incompatible materials.</p>
             </div>
             <div className="role-box role-box-info">
                <h4>Audit History</h4>
                <p>Immutable logs for compliance inspections.</p>
             </div>
             <div className="role-box role-box-success">
                <h4>Access Control</h4>
                <p>Role-based security for sensitive materials.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="section-container">
        <span className="section-tag">The Process</span>
        <h2 className="section-title">How {systemName} Powers Your Lab</h2>
        <div className="workflow-grid">
           <WorkflowStep num="1" title="Add" desc="Fast enrollment of new chemicals" />
           <WorkflowStep num="2" title="Assign" desc="Allocate to secure storage" />
           <WorkflowStep num="3" title="Track" desc="Real-time volume monitoring" />
           <WorkflowStep num="4" title="Transfer" desc="Move assets between labs" />
           <WorkflowStep num="5" title="Dispose" desc="Safety-compliant removal" />
        </div>
      </section>

      {/* User Roles Section */}
      <section className="section-container">
         <h2 className="section-title">Tailored for your entire team</h2>
         <div className="roles-container">
            <RoleCard 
              name="Admin" 
              desc="System-wide configuration, user management, and security oversight."
            />
            <RoleCard 
              name="Lab Manager" 
              desc="Full control over inventory, approvals, and lab-specific settings."
            />
            <RoleCard 
              name="Lab Staff" 
              desc="Daily operations: check-in/out, scanning, and request submission."
            />
            <RoleCard 
              name="Auditor" 
              desc="Read-only access to logs, reports, and safety certifications."
            />
         </div>
      </section>

      {/* CTA Section */}
      <section className="section-container cta-section">
         <h2 className="cta-title">Ready to modernize your inventory?</h2>
         <p className="hero-description cta-description">
           Join hundreds of laboratories globally using {systemName} for world-class management.
         </p>
         <Link to="/register" className="btn-hero-primary btn-cta-primary">
           Create Your Account <ArrowRight size={20} className="inline ml-2" />
         </Link>
      </section>

      {/* Footer */}
      <footer id="landing-footer" className="landing-footer">
        <div className="footer-logo">
          {systemLogo ? (
            <img src={systemLogo} alt="Logo" style={{ height: '24px', width: 'auto', marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }} />
          ) : settingsLoaded ? (
            <FlaskConical size={24} className="inline mr-2" />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--secondary-100, #e2e8f0)', display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} aria-hidden />
          )}
          {systemName}
        </div>
        <div className="footer-links">
           <a href={MOBILE_APP_BUILD_URL} target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: 'var(--accent)', fontWeight: 800 }}>
             <Smartphone size={14} className="inline mr-1" /> Mobile App Build
           </a>
           <Link to="/privacy" state={{ fromFooter: true }} className="nav-link">Privacy Policy</Link>
           <Link to="/terms" state={{ fromFooter: true }} className="nav-link">Terms of Service</Link>
           <Link to="/support" state={{ fromFooter: true }} className="nav-link">Contact Support</Link>
           <span className="nav-link" style={{ cursor: 'pointer' }} onClick={() => setShowDevModal(true)}>Developed By</span>
        </div>
        <p className="copyright">© 2026 {systemName}. All rights reserved.</p>
      </footer>

      {showDevModal && (
        <div className="dev-modal-overlay" onClick={() => setShowDevModal(false)}>
          <div className="dev-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dev-modal-title">
            <button
              type="button"
              className="dev-modal-close"
              onClick={() => setShowDevModal(false)}
              aria-label="Close"
            >
              &times;
            </button>

            <div className="dev-modal-header">
              <div className="dev-modal-brand-ring">
                <div className="dev-modal-brand-inner">
                  <h2>AppFactory Academy</h2>
                  <p>Wollo University</p>
                </div>
              </div>
              <h3 id="dev-modal-title">Proudly Developed By</h3>
            </div>

            <div className="dev-modal-grid">
              {[
                { name: 'Amir Mesfin', email: 'amir.mesfin136@gmail.com', phone: '0962945025', accent: 'blue' },
                { name: 'Ahmed Saulih', email: 'sualihahmed26@gmail.com', phone: '0926352943', accent: 'green' },
                { name: 'Tsegazeab', email: 'tsegazeab@gmail.com', phone: '0966610048', accent: 'amber' }
              ].map((dev) => (
                <div key={dev.phone} className={`dev-card dev-card-${dev.accent}`}>
                  <h4>{dev.name}</h4>
                  <p>{dev.email}</p>
                  <p>📞 {dev.phone}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-desc">{desc}</p>
  </div>
);

const WorkflowStep = ({ num, title, desc }) => (
  <div className="workflow-step">
    <div className="step-num">{num}</div>
    <h4 className="step-title">{title}</h4>
    <p className="step-desc">{desc}</p>
  </div>
);

const RoleCard = ({ name, desc }) => (
  <div className="role-box">
    <Users size={24} color="var(--landing-accent)" style={{ marginBottom: '1rem' }} />
    <h4>{name}</h4>
    <p>{desc}</p>
  </div>
);


export default Landing;
