import { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../../layout/Layout";
import { useAuth } from "../../context/AuthContext";
import "../../styles/MFASetup.css";

const MFASetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mfaData, setMfaData] = useState(null); // { secret, qrCode }
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("overview"); // overview, setup-totp, setup-sms

  const fetchStatus = async () => {
     // For now, we rely on user object in AuthContext which should have mfa_enabled if we updated it
     // But we'll just check the setup routes
  };

  const initTotp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/auth/mfa/setup/totp', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMfaData(data);
      setStep("setup-totp");
    } catch (err) {
      setError("Failed to initialize TOTP setup.");
    } finally {
      setLoading(false);
    }
  };

  const enableMfa = async (type) => {
    setLoading(true);
    setError("");
    try {
      await axios.post('/api/auth/mfa/enable', {
        type,
        code: type === 'totp' ? code : null,
        phone: type === 'sms' ? phone : null
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage(`MFA (${type.toUpperCase()}) enabled successfully!`);
      setStep("overview");
      // Optionally reload or update user context
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!window.confirm("Are you sure you want to disable MFA? This reduces your account security.")) return;
    setLoading(true);
    try {
      await axios.post('/api/auth/mfa/disable', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage("MFA has been disabled.");
      // Optionally update user context
    } catch (err) {
      setError("Failed to disable MFA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mfa-setup-wrapper">
        <h1 className="mfa-setup-header">Two-Factor Authentication</h1>
        <p className="mfa-setup-desc">Add an extra layer of security to your CIMS account.</p>

        {message && (
          <div className="mfa-alert mfa-alert-success">
             <svg className="mfa-alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
             {message}
          </div>
        )}

        {error && (
          <div className="mfa-alert mfa-alert-error">
             <svg className="mfa-alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {error}
          </div>
        )}

        {step === "overview" && (
          <div className="mfa-method-list">
            <div className="mfa-method-card">
              <div className="mfa-method-content">
                <div className="mfa-method-info">
                  <div className="mfa-method-icon-box primary">
                    <svg className="mfa-method-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="mfa-method-title">Authenticator App</h3>
                    <p className="mfa-method-subtitle">Use Google Authenticator or Authy (Recommended)</p>
                  </div>
                </div>
                <button 
                  onClick={initTotp}
                  disabled={loading}
                  className="mfa-btn mfa-btn-primary"
                >
                  Setup
                </button>
              </div>
            </div>

            <div className="mfa-method-card">
              <div className="mfa-method-content">
                <div className="mfa-method-info">
                  <div className="mfa-method-icon-box orange">
                    <svg className="mfa-method-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <div>
                    <h3 className="mfa-method-title">SMS Verification</h3>
                    <p className="mfa-method-subtitle">Receive a 6-digit code via text message</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep("setup-sms")}
                  className="mfa-btn mfa-btn-secondary"
                >
                  Setup
                </button>
              </div>
            </div>

            <button 
              onClick={disableMfa}
              className="mfa-disable-btn"
            >
              Disable all MFA methods
            </button>
          </div>
        )}

        {step === "setup-totp" && mfaData && (
          <div className="mfa-setup-panel">
             <button onClick={() => setStep("overview")} className="mfa-back-btn">
                <svg className="mfa-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back
             </button>
             <h2 className="mfa-panel-title">Setup Authenticator App</h2>
             
             <div className="mfa-totp-grid">
                <div className="mfa-qr-box">
                   <img src={mfaData.qrCode} alt="QR Code" className="mfa-qr-img" />
                </div>
                <div className="mfa-totp-content">
                   <div className="mfa-step-block">
                      <p className="mfa-step-title">1. Scan this QR code</p>
                      <p className="mfa-step-desc">Open your authenticator app (Authy, Google Authenticator) and scan the code above.</p>
                   </div>
                   <div className="mfa-step-block">
                      <p className="mfa-step-title">2. Enter the 6-digit code</p>
                      <input 
                        type="text" 
                        maxLength="6"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000 000"
                        className="mfa-code-input"
                      />
                      <button 
                        onClick={() => enableMfa("totp")}
                        disabled={loading || code.length !== 6}
                        className="mfa-submit-btn"
                      >
                        {loading ? "Verifying..." : "Verify & Enable"}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === "setup-sms" && (
           <div className="mfa-setup-panel">
              <button onClick={() => setStep("overview")} className="mfa-back-btn">
                <svg className="mfa-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back
             </button>
             <h2 className="mfa-panel-title">Setup SMS Verification</h2>
             
             <div className="mfa-sms-form">
                <div className="mfa-step-block">
                   <label className="mfa-input-label">Phone Number</label>
                   <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="mfa-text-input"
                  />
                  <p className="mfa-input-hint">Include country code (e.g., +1 for USA)</p>
                </div>
                
                <button 
                  onClick={() => enableMfa("sms")}
                  disabled={loading || phone.length < 10}
                  className="mfa-submit-btn"
                >
                  {loading ? "Processing..." : "Enable SMS MFA"}
                </button>
             </div>
           </div>
        )}
      </div>
    </Layout>
  );
};

export default MFASetup;
