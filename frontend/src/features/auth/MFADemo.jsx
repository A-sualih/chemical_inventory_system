import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../../styles/MFADemo.css";

const MFADemo = () => {
  const [step, setStep] = useState(1); // 1: Login, 2: Verification, 3: Success
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  // Handle email/password submission
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  // Handle code input
  const handleCodeChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 2000);
  };

  return (
    <div 
      className="mfa-container"
      style={{ backgroundImage: 'url("/bg_security.png")' }}
    >
      {/* Overlay for better readability */}
      <div className="mfa-overlay"></div>

      <div className="mfa-content">
        <div className="mfa-card">
          
          {step === 1 && (
            <div className="animate-fade-up">
              <div className="mfa-icon-wrapper">
                <div className="mfa-icon-box primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mfa-icon text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="mfa-title">Security Portal</h2>
              <p className="mfa-subtitle">Please sign in to access your secure dashboard.</p>
              
              <form onSubmit={handleLogin} className="mfa-form">
                <div className="mfa-form-group">
                  <label className="mfa-label">Work Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mfa-input"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="mfa-form-group">
                  <label className="mfa-label">Secure Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mfa-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="mfa-btn-primary"
                >
                  <span className={`mfa-btn-content ${loading ? 'hidden' : ''}`}>
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" className="mfa-btn-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {loading && (
                    <div className="mfa-loader">
                      <div className="mfa-spinner"></div>
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-zoom-in">
              <div className="mfa-icon-wrapper">
                <div className="mfa-icon-box yellow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mfa-icon text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="mfa-title">Verify it's you</h2>
              <p className="mfa-subtitle">We've sent a 6-digit code to your mobile device ending in <b>*8291</b>.</p>
              
              <form onSubmit={handleVerify} className="mfa-code-form">
                <div className="mfa-code-inputs">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      autoFocus={index === 0}
                      className="mfa-code-input"
                    />
                  ))}
                </div>
                
                <div className="mfa-actions">
                  <button 
                    type="submit" 
                    disabled={loading || code.some(d => !d)}
                    className="mfa-btn-primary"
                  >
                    <span className={`mfa-btn-content ${loading ? 'hidden' : ''}`}>Verify Identity</span>
                    {loading && (
                      <div className="mfa-loader">
                        <div className="mfa-spinner"></div>
                      </div>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="mfa-btn-text"
                  >
                    Back to login
                  </button>
                </div>
              </form>
              
              <p className="mfa-resend">
                Resend code in 45s
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="animate-zoom-in-slow mfa-success-content">
              <div className="mfa-icon-wrapper">
                <div className="mfa-icon-box emerald">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mfa-icon-large text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h2 className="mfa-title">Access Granted</h2>
              <p className="mfa-subtitle">Welcome back! You have successfully authenticated.</p>
              
              <Link 
                to="/"
                className="mfa-btn-success"
              >
                Go to Dashboard
              </Link>
              
              <div className="mfa-session-info">
                <p className="mfa-session-text">Session ID: AE-99-XC-21</p>
              </div>
            </div>
          )}
        </div>
        
        <p className="mfa-footer">
          MFA Demo • Powered by AntiGravity
        </p>
      </div>
    </div>
  );
};

export default MFADemo;
