import React from 'react';
import { Link } from 'react-router-dom';
import { Book, FileText, Code, Database } from 'lucide-react';
import '../styles/LearnMore.css';

const Documentation = () => {
  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to="/" className="back-link">← Home</Link>
          <h1>System <span>Documentation</span></h1>
          <p className="hero-sub">Comprehensive guides for users and administrators.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container">
          <div className="detailed-features">
            <div className="feature-row">
              <div className="f-icon"><Book /></div>
              <div className="f-text">
                <h4>Getting Started</h4>
                <p>Learn how to setup your lab, register chemicals, and print QR labels.</p>
              </div>
            </div>
            <div className="feature-row">
              <div className="f-icon"><FileText /></div>
              <div className="f-text">
                <h4>API Reference</h4>
                <p>Integration guides for connecting automation hardware and external ERPs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Documentation;
