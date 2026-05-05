import { useState, useRef } from "react";
import { Link } from "react-router-dom";

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
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center"
      style={{ backgroundImage: 'url("/bg_security.png")' }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-dark p-8 md:p-12 rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-primary-600/20 rounded-3xl flex items-center justify-center blur-effect border border-primary-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-white text-center mb-2 heading-font tracking-tight">Security Portal</h2>
              <p className="text-secondary-400 text-center mb-10 text-sm">Please sign in to access your secure dashboard.</p>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-primary-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:ring-2 focus:ring-primary-500/50 outline-none transition-all"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-secondary-600 focus:ring-2 focus:ring-primary-500/50 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white p-5 rounded-2xl font-bold text-lg shadow-lg shadow-primary-700/20 active:scale-95 transition-all relative overflow-hidden group"
                >
                  <span className={loading ? "opacity-0" : "opacity-100 flex items-center justify-center gap-2"}>
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-3xl flex items-center justify-center border border-yellow-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-white text-center mb-2 heading-font tracking-tight">Verify it's you</h2>
              <p className="text-secondary-400 text-center mb-10 text-sm">We've sent a 6-digit code to your mobile device ending in <b>*8291</b>.</p>
              
              <form onSubmit={handleVerify} className="space-y-10">
                <div className="flex justify-between gap-2">
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
                      className="w-12 h-16 md:w-16 md:h-20 bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-bold text-white focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition-all"
                    />
                  ))}
                </div>
                
                <div className="space-y-4">
                  <button 
                    type="submit" 
                    disabled={loading || code.some(d => !d)}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white p-5 rounded-2xl font-bold text-lg shadow-lg shadow-primary-700/20 active:scale-95 transition-all relative overflow-hidden"
                  >
                    <span className={loading ? "opacity-0" : "opacity-100"}>Verify Identity</span>
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-secondary-500 hover:text-white transition-colors text-sm font-medium"
                  >
                    Back to login
                  </button>
                </div>
              </form>
              
              <p className="mt-8 text-center text-xs text-secondary-600 uppercase tracking-widest font-bold">
                Resend code in 45s
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-700 text-center">
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2 heading-font font-display">Access Granted</h2>
              <p className="text-secondary-400 mb-10">Welcome back! You have successfully authenticated.</p>
              
              <Link 
                to="/"
                className="inline-block bg-white text-secondary-950 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-secondary-100 transition-all transform active:scale-95 shadow-xl"
              >
                Go to Dashboard
              </Link>
              
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-secondary-600 text-[10px] uppercase tracking-widest font-bold">Session ID: AE-99-XC-21</p>
              </div>
            </div>
          )}
        </div>
        
        <p className="mt-8 text-center text-secondary-600 text-[10px] uppercase tracking-[0.3em] font-black opacity-50">
          MFA Demo • Powered by AntiGravity
        </p>
      </div>
    </div>
  );
};

export default MFADemo;
