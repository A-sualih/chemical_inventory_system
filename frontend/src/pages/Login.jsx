import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";

const Login = () => {
  const { login, user: currentUser } = useAuth();
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockTimer, setLockTimer] = useState(0);

  const { sessionExpired, setSessionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate("/");
  }, [currentUser, navigate]);

  useEffect(() => {
    if (sessionExpired) {
      setError("Your session has expired due to inactivity. Please log in again.");
      setSessionExpired(false);
    }
  }, [sessionExpired, setSessionExpired]);

  useEffect(() => {
    let interval;
    if (lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockTimer === 0 && view === "locked") {
      setView("login");
      setFailedAttempts(0);
    }
    return () => clearInterval(interval);
  }, [lockTimer, view]);

  const [userId, setUserId] = useState(null);
  const [mfaType, setMfaType] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      setIsLoading(false);

      if (data.requireMfa) {
        setUserId(data.userId);
        setMfaType(data.mfaType);
        setView("mfa");
      } else {
        const res = await login(email, password);
        if (res.success) navigate("/");
        else setError(res.error);
      }
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.error || "Invalid credentials.";
      setError(msg);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        setView("locked");
        setLockTimer(15 * 60);
      }
    }
  };


  const handleMfa = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data } = await axios.post('/api/auth/mfa/verify', { userId, code: otp });
      localStorage.setItem('cims_token', data.token);
      localStorage.setItem('cims_user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.error || "Invalid verification code.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post('/api/auth/reset-password', { email });
      setIsLoading(false);
      alert(data.message);
      setView("login");
    } catch {
      setIsLoading(false);
      alert("Error sending reset password link");
    }
  };

  const renderView = () => {
    switch (view) {

      case "mfa":
        return (
          <div className="login-view-wrapper">
            <div className="mfa-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" className="mfa-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="login-title-h2">Verify Identity</h2>
            <p className="login-subtitle">Enter the 6-digit code sent to your device.</p>
            <form onSubmit={handleMfa} className="form-spacing">
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                className="otp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              {error && <p className="login-error-text">{error}</p>}
              <button type="submit" disabled={isLoading} className="submit-btn">
                {isLoading ? "Verifying..." : "Confirm Code"}
              </button>
            </form>
            <button onClick={() => setView("login")} className="back-btn">Back to login</button>
          </div>
        );

      case "forgot-password":
        return (
          <div className="login-view-wrapper">
            <h2 className="login-title-h2">Reset Password</h2>
            <p className="login-subtitle">Enter your email for the recovery link.</p>
            <form onSubmit={handleForgotPassword} className="form-spacing">
              <div className="login-form-group">
                <label className="login-label">Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="submit-btn">
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <button onClick={() => setView("login")} className="back-btn">Back to sign in</button>
          </div>
        );

      case "locked":
        return (
          <div className="login-view-wrapper login-text-center">
            <div className="locked-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="locked-icon icon-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="login-title-h2">Account Locked</h2>
            <p className="login-subtitle">For security reasons, your account is temporarily locked.</p>
            <div className="timer-box">
              <span className="timer-text">{lockTimer}s</span>
              <p className="logo-subtext" style={{marginTop: '0.5rem'}}>Time remaining</p>
            </div>
            <p className="login-subtitle" style={{fontStyle: 'italic', fontSize: '0.75rem'}}>Please contact system administrator if this was an error.</p>
          </div>
        );

      default: // login
        return (
          <div className="login-view-wrapper">
            <div className="logo-header-wrapper">
              <div className="app-logo-box">
                <svg xmlns="http://www.w3.org/2000/svg" className="app-logo icon-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                </svg>
              </div>
              <h1 className="login-title-h1">
                CIMS Portal
              </h1>
              <p className="logo-subtext">
                Chemical Inventory Management
              </p>
            </div>

            <form onSubmit={handleLogin} className="form-spacing">
              <div className="login-form-group">
                <label className="login-label">Work Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Secure Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="login-error-text" style={{textAlign: 'left'}}>{error}</p>}

              <div className="form-footer-actions">
                <label className="remember-me-label">
                  <input type="checkbox" className="checkbox-custom" />
                  <span>Remember me</span>
                </label>
                <button type="button" onClick={() => setView("forgot-password")} className="forgot-password-link">Forgot Password?</button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="submit-btn"
              >
                {!isLoading ? (
                  <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                    Sign In
                    <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div className="spinner-mini" style={{width: '1.25rem', height: '1.25rem', borderTopColor: 'white'}}></div>
                  </div>
                )}
              </button>
            </form>

            <div className="register-prompt">
              <p>
                New to CIMS?{" "}
                <Link to="/register" className="register-link">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Decorative Gradient Blobs */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      {/* Top Right Toggle Buttons */}
      <div className="top-actions-wrapper">
        <button
          onClick={() => setView("login")}
          className="portal-toggle-btn"
        >
          Secure Portal
        </button>
      </div>

      {/* Glassmorph Card */}
      <div className="login-card">
        {renderView()}
      </div>


      {/* Subtle Bottom Footer */}
      <p className="page-footer-tag">
        Secure Access Provided by GoldenBatch Tech
      </p>
    </div>
  );
};

export default Login;

