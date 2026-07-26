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
  ArrowUpRight
} from 'lucide-react';
import '../styles/Landing.css';
import ThemeToggle from '../components/common/ThemeToggle';

const Landing = () => {
  const { user } = useAuth();
  const { settings, settingsLoaded } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDevModal, setShowDevModal] = React.useState(false);
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
            <FlaskConical size={32} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary-100, #e2e8f0)' }} aria-hidden />
          )}
          <span>{systemName}</span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#workflow" className="nav-link">Workflow</a>
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="btn-nav-login">Go to Dashboard</Link>
          ) : (
            <Link to="/login" className="btn-nav-login" style={{ background: 'var(--accent)', color: 'var(--btn-text)', border: 'none' }}>Sign In</Link>
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
      <section id="features" className="section-container" style={{ paddingTop: '10rem' }}>
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




      {/* About Section */}
      <section id="about" className="section-container">
        <div className="about-section">
          <div className="about-visual">
             <Database size={80} color="var(--landing-teal)" style={{ opacity: 0.5 }} />
          </div>
          <div className="about-content">
             <span className="section-tag" style={{ textAlign: 'left' }}>Our Mission</span>
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
             <Link to="/learn-more" className="btn-hero-secondary" style={{ padding: '0.8rem 2rem' }}>Learn More About Our Tech</Link>
          </div>
        </div>
      </section>

      {/* Safety & Compliance Section */}
      <section className="section-container" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <ShieldAlert size={60} color="#ef4444" style={{ marginBottom: '2rem' }} />
          <h2 className="section-title">Compliance is not optional</h2>
          <p className="hero-description" style={{ margin: '0 auto 4rem' }}>
            Built to exceed safety standards, {systemName} integrates with GHS protocols and provides 
            real-time hazard analysis for every storage location in your facility.
          </p>
          <div className="roles-container">
             <div className="role-box" style={{ borderLeft: '4px solid #ef4444' }}>
                <h4>SDS Integration</h4>
                <p>Digital access to safety sheets at the point of use.</p>
             </div>
             <div className="role-box" style={{ borderLeft: '4px solid #f59e0b' }}>
                <h4>Hazard Tracking</h4>
                <p>Automatic classification of incompatible materials.</p>
             </div>
             <div className="role-box" style={{ borderLeft: '4px solid #3b82f6' }}>
                <h4>Audit History</h4>
                <p>Immutable logs for compliance inspections.</p>
             </div>
             <div className="role-box" style={{ borderLeft: '4px solid #10b981' }}>
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
      <section className="section-container" style={{ textAlign: 'center', padding: '10rem 5%' }}>
         <h2 style={{ fontSize: '3.5rem', marginBottom: '2rem' }}>Ready to modernize your inventory?</h2>
         <p className="hero-description" style={{ margin: '0 auto 3rem' }}>
           Join hundreds of laboratories globally using {systemName} for world-class management.
         </p>
         <Link to="/register" className="btn-hero-primary" style={{ padding: '1.2rem 4rem', fontSize: '1.2rem' }}>
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
