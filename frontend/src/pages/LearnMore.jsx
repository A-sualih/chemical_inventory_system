import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { 
  ShieldCheck, 
  FlaskConical, 
  Package, 
  Activity, 
  Trash2, 
  ClipboardList, 
  Bell, 
  Users, 
  Database, 
  Cpu, 
  Rocket, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Boxes,
  ArrowRight,
  Code,
  Globe
} from 'lucide-react';
import '../styles/LearnMore.css';

const LearnMore = () => {
  const { settings } = useSettings();
  const systemName = settings?.systemName || "CIMS PRO";
  const orgName = settings?.orgName || "Managed Stack";

  return (
    <div className="learn-more-container">
      {/* Hero Section */}
      <section className="learn-hero">
        <div className="learn-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>Deep Dive into <span>{systemName}</span></h1>
          <p className="hero-sub">
            The standard for modern laboratory chemical management and safety compliance.
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="learn-section intro-bg">
        <div className="container">
          <div className="section-header">
            <span className="badge">Platform Overview</span>
            <h2>Why {systemName} Exists</h2>
          </div>
          <div className="text-content">
            <p>
              {systemName} is a centralized chemical inventory platform designed to improve 
              laboratory safety, inventory visibility, compliance monitoring, and multi-lab management. 
              Built for researchers, by engineers who understand the complexities of modern science.
            </p>
          </div>
        </div>
      </section>

      {/* Laboratory Challenges */}
      <section className="learn-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-warning">The Problem</span>
            <h2>Laboratory Challenges</h2>
          </div>
          <div className="challenges-grid">
            <div className="challenge-item">
              <AlertCircle color="#ef4444" />
              <h4>Manual Errors</h4>
              <p>Inaccurate paper logs leading to inventory discrepancy.</p>
            </div>
            <div className="challenge-item">
              <AlertCircle color="#ef4444" />
              <h4>Chemical Loss</h4>
              <p>Inability to track the exact location of high-value reagents.</p>
            </div>
            <div className="challenge-item">
              <AlertCircle color="#ef4444" />
              <h4>Expired Agents</h4>
              <p>Risk of using degraded chemicals in critical experiments.</p>
            </div>
            <div className="challenge-item">
              <AlertCircle color="#ef4444" />
              <h4>Poor Disposal</h4>
              <p>Lack of audit trails for hazardous waste management.</p>
            </div>
          </div>
          <div className="solution-banner">
             <h3>How we solve it</h3>
             <p>Our digital twin architecture ensures every milliliter is accounted for, from arrival to disposal.</p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="learn-section feature-bg">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-primary">Capabilities</span>
            <h2>Core Features</h2>
          </div>
          <div className="detailed-features">
            <FeatureRow 
              icon={<Package size={32} />}
              title="Chemical Tracking"
              desc="Real-time volume and mass tracking with automated density calculations."
            />
            <FeatureRow 
              icon={<Boxes size={32} />}
              title="Batch Management"
              desc="Track shelf life and manufacturer lots to ensure experimental reproducibility."
            />
            <FeatureRow 
              icon={<FlaskConical size={32} />}
              title="Disposal Workflows"
              desc="Comprehensive waste requisition queues with supervisor approval steps."
            />
            <FeatureRow 
              icon={<FileText size={32} />}
              title="SDS Management"
              desc="Cloud-synced Safety Data Sheets accessible via QR code at any station."
            />
          </div>
        </div>
      </section>

      {/* Multi-Lab Support */}
      <section className="learn-section">
        <div className="container">
          <div className="multi-lab-layout">
            <div className="visual-side">
               <Globe size={120} opacity={0.1} />
            </div>
            <div className="content-side">
               <span className="badge">Institutional Scale</span>
               <h2>Multi-Lab Management</h2>
               <ul className="check-list">
                 <li><CheckCircle2 size={18} /> <strong>Department Isolation:</strong> Keep independent labs separate and secure.</li>
                 <li><CheckCircle2 size={18} /> <strong>Central Administration:</strong> Institutional-wide visibility for safety officers.</li>
                 <li><CheckCircle2 size={18} /> <strong>Cross-Lab Transfers:</strong> Request materials from partner labs with one click.</li>
                 <li><CheckCircle2 size={18} /> <strong>Role-Based Access:</strong> Granular permissions tailored to each researcher.</li>
               </ul>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="learn-section dark-section">
        <div className="container">
          <div className="section-header">
             <h2>Structured for Your Entire Team</h2>
          </div>
          <table className="roles-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Responsibility</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Admin</strong></td>
                <td>System-wide management, security, and global configuration.</td>
              </tr>
              <tr>
                <td><strong>Lab Manager</strong></td>
                <td>Controls inventory cycles, approvals, and specific lab parameters.</td>
              </tr>
              <tr>
                <td><strong>Technician</strong></td>
                <td>Daily operations, scanning, consumption updates, and transfers.</td>
              </tr>
              <tr>
                <td><strong>Safety Manager</strong></td>
                <td>Monitors compliance, audits SDS, and reviews disposal logs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="learn-section">
        <div className="container">
          <div className="section-header">
             <h2>Streamlined Lifecycle Workflow</h2>
          </div>
          <div className="workflow-steps-v2">
             <div className="w-step">Register Chemical</div>
             <div className="w-arrow">↓</div>
             <div className="w-step">Assign Batch</div>
             <div className="w-arrow">↓</div>
             <div className="w-step">Track Containers</div>
             <div className="w-arrow">↓</div>
             <div className="w-step">Monitor Inventory</div>
             <div className="w-arrow">↓</div>
             <div className="w-step">Transfer / Request</div>
             <div className="w-arrow">↓</div>
             <div className="w-step">Dispose Safely</div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="learn-section tech-bg">
        <div className="container">
          <div className="section-header">
             <h2>Technology & Security</h2>
          </div>
          <div className="tech-grid">
            <div className="tech-card">
              <Cpu size={32} />
              <h3>Frontend</h3>
              <p>React 18 + Vite + Tailwind</p>
            </div>
            <div className="tech-card">
              <Database size={32} />
              <h3>Backend</h3>
              <p>Node.js + Express + MongoDB</p>
            </div>
            <div className="tech-card">
              <ShieldCheck size={32} />
              <h3>Security</h3>
              <p>JWT MFA + AES-256 Encryption</p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="learn-section">
        <div className="container">
          <div className="section-header">
             <span className="badge badge-accent">Roadmap</span>
             <h2>Future Vision</h2>
          </div>
          <div className="roadmap-grid">
             <div className="roadmap-item">
                <h3>AI Inventory</h3>
                <p>Advanced prediction for procurement cycles.</p>
             </div>
             <div className="roadmap-item">
                <h3>IoT Integration</h3>
                <p>Smart sensors for real-time temperature monitoring.</p>
             </div>
             <div className="roadmap-item">
                <h3>Mobile App</h3>
                <p>Native iOS/Android scanning applications.</p>
             </div>
          </div>
        </div>
      </section>

      {/* About Us & Footer */}
      <footer className="learn-footer">
        <div className="container">
          <div className="footer-layout">
             <div className="brand-side">
                <h2>{systemName}</h2>
                <p>Developed to institutionalize safety and precision in modern laboratories under {orgName}.</p>
                <div className="social-links">
                   <a href="#"><Code size={20} /></a>
                   <a href="#"><Globe size={20} /></a>
                </div>
             </div>
             <div className="links-side">
                <div className="link-col">
                  <h4>Resources</h4>
                  <Link to="/docs">Documentation</Link>
                  <Link to="/support">Support</Link>
                  <Link to="/privacy">Privacy Policy</Link>
                </div>
                <div className="link-col">
                  <h4>Account</h4>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </div>
             </div>
          </div>
          <div className="footer-bottom">
             <p>© 2026 {systemName} | {orgName}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureRow = ({ icon, title, desc }) => (
  <div className="feature-row">
    <div className="f-icon">{icon}</div>
    <div className="f-text">
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  </div>
);

export default LearnMore;
