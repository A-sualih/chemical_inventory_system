import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, HelpCircle, Phone, MessageSquare } from 'lucide-react';
import '../styles/LearnMore.css';

const Support = () => {
  return (
    <div className="learn-more-container">
      <section className="learn-hero">
        <div className="container">
          <Link to="/" className="back-link">← Home</Link>
          <h1>Contact <span>Support</span></h1>
          <p className="hero-sub">We're here to help you maintain a safe and organized lab.</p>
        </div>
      </section>

      <section className="learn-section">
        <div className="container">
          <div className="tech-grid">
            <div className="tech-card">
              <Mail size={32} />
              <h3>Email Us</h3>
              <p>support@labsystem.edu</p>
            </div>
            <div className="tech-card">
              <HelpCircle size={32} />
              <h3>Help Center</h3>
              <p>Search our knowledge base</p>
            </div>
            <div className="tech-card">
              <MessageSquare size={32} />
              <h3>Live Chat</h3>
              <p>Available 9AM - 5PM EST</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
