import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";

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
      // Authenticate with the returned token
      localStorage.setItem('cims_token', data.token);
      localStorage.setItem('cims_user', JSON.stringify(data.user));
      window.location.reload(); // Simple way to trigger AuthContext refresh
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 heading-font text-center">Verify Identity</h2>
            <p className="text-secondary-400 text-sm mb-8 text-center">Enter the 6-digit code sent to your device. (Use 123456)</p>
            <form onSubmit={handleMfa} className="space-y-6">
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-3xl tracking-[0.5em] font-bold text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}
              <button type="submit" disabled={isLoading} className="w-full bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50">
                {isLoading ? "Verifying..." : "Confirm Code"}
              </button>
            </form>
            <button onClick={() => setView("login")} className="mt-6 w-full text-secondary-500 text-sm font-medium hover:text-white transition-colors">Back to login</button>
          </div>
        );

      case "forgot-password":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white mb-2 heading-font">Reset Password</h2>
            <p className="text-secondary-400 text-sm mb-8">Enter your email for the recovery link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Email Address</label>
                <input type="email" placeholder="appfactory.com" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" required />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50">
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <button onClick={() => setView("login")} className="mt-8 w-full text-secondary-500 text-sm font-medium hover:text-white transition-colors">Back to sign in</button>
          </div>
        );

      case "locked":
        return (
          <div className="animate-in zoom-in duration-500 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 heading-font">Account Locked</h2>
            <p className="text-secondary-400 text-sm mb-8">For security reasons, your account is temporarily locked.</p>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8">
              <span className="text-4xl font-bold text-white font-mono">{lockTimer}s</span>
              <p className="text-xs text-secondary-500 mt-2 uppercase tracking-widest font-bold">Time remaining</p>
            </div>
            <p className="text-secondary-500 text-xs italic">Please contact system administrator if this was an error.</p>
          </div>
        );

      default: // login
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/30 transform hover:rotate-12 transition-transform cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.642.257a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l1.166 1.166a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l.144-.144a1 1 0 011.414 0l.144.144a2 2 0 002.828 0l1.166-1.166z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 heading-font text-center">
                CIMS Portal
              </h1>
              <p className="text-secondary-400 mt-2 text-center text-sm tracking-wide uppercase font-medium">
                Chemical Inventory Management
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="group">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-widest mb-2 px-1">Work Email</label>
                <div className="relative group-focus-within:transform group-focus-within:-translate-y-1 transition-transform">
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-widest mb-2 px-1">Secure Password</label>
                <div className="relative group-focus-within:transform group-focus-within:-translate-y-1 transition-transform">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs font-medium px-1 drop-shadow-sm">{error}</p>}

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center space-x-2 text-sm text-secondary-400 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded bg-white/5 border-white/10 text-primary-500 focus:ring-primary-500/50" />
                  <span>Remember me</span>
                </label>
                <button type="button" onClick={() => setView("forgot-password")} className="text-sm text-primary-400 hover:text-primary-300 transition-colors">Forgot Password?</button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full relative group overflow-hidden bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary-900/40 transform active:scale-[0.98] transition-all duration-200 ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <span className={isLoading ? 'opacity-0' : 'opacity-100 flex items-center justify-center gap-2'}>
                  Sign In
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 text-center px-1">
              <p className="text-secondary-400 text-sm font-medium">
                New to CIMS?{" "}
                <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-secondary-950">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-700/40 rounded-full blur-[140px] animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[160px]"></div>

      {/* Top Right Toggle Buttons */}
      <div className="absolute top-8 right-8 z-20 flex gap-2">
        <button 
          onClick={() => setView("login")} 
          className="px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all glass bg-white/95 text-secondary-950 shadow-lg"
        >
          Secure Portal
        </button>
      </div>


      {/* Glassmorph Card */}
      <div className="glass-dark w-full max-w-md p-8 md:p-12 rounded-[2rem] relative z-10 border border-white/10 shadow-2xl transition-all duration-500">
        {renderView()}
      </div>


      {/* Subtle Bottom Footer */}
      <p className="absolute bottom-8 text-secondary-600 text-[10px] uppercase tracking-[0.2em] font-bold">
        Secure Access Provided by GoldenBatch Tech
      </p>
    </div>
  );
};

export default Login;

