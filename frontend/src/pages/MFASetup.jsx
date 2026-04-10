import { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";

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
      <div className="max-w-2xl mx-auto py-10">
        <h1 className="text-4xl font-black heading-font text-secondary-950 mb-2">Two-Factor Authentication</h1>
        <p className="text-secondary-500 mb-10">Add an extra layer of security to your CIMS account.</p>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-8 flex items-center gap-3">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
             {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-8 flex items-center gap-3">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {error}
          </div>
        )}

        {step === "overview" && (
          <div className="space-y-6">
            <div className="bg-white border border-secondary-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900">Authenticator App</h3>
                    <p className="text-secondary-500 text-sm">Use Google Authenticator or Authy (Recommended)</p>
                  </div>
                </div>
                <button 
                  onClick={initTotp}
                  disabled={loading}
                  className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  Setup
                </button>
              </div>
            </div>

            <div className="bg-white border border-secondary-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900">SMS Verification</h3>
                    <p className="text-secondary-500 text-sm">Receive a 6-digit code via text message</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep("setup-sms")}
                  className="bg-white border border-secondary-200 text-secondary-900 px-6 py-2.5 rounded-xl font-bold hover:bg-secondary-50 transition-all active:scale-95"
                >
                  Setup
                </button>
              </div>
            </div>

            <button 
              onClick={disableMfa}
              className="text-red-500 font-bold text-sm hover:underline mt-4 px-4"
            >
              Disable all MFA methods
            </button>
          </div>
        )}

        {step === "setup-totp" && mfaData && (
          <div className="bg-white border border-secondary-100 rounded-[2.5rem] p-10 shadow-xl animate-in zoom-in-95 duration-500">
             <button onClick={() => setStep("overview")} className="text-secondary-400 hover:text-secondary-900 mb-6 flex items-center gap-2 font-bold text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back
             </button>
             <h2 className="text-2xl font-black heading-font text-secondary-900 mb-6">Setup Authenticator App</h2>
             
             <div className="flex flex-col md:flex-row gap-10">
                <div className="bg-secondary-50 p-4 rounded-3xl border border-secondary-100 shadow-inner">
                   <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                </div>
                <div className="flex-1 space-y-6">
                   <div className="space-y-2">
                      <p className="text-sm font-bold text-secondary-700">1. Scan this QR code</p>
                      <p className="text-xs text-secondary-500">Open your authenticator app (Authy, Google Authenticator) and scan the code above.</p>
                   </div>
                   <div className="space-y-4">
                      <p className="text-sm font-bold text-secondary-700">2. Enter the 6-digit code</p>
                      <input 
                        type="text" 
                        maxLength="6"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000 000"
                        className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-center text-3xl font-black tracking-widest focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      />
                      <button 
                        onClick={() => enableMfa("totp")}
                        disabled={loading || code.length !== 6}
                        className="w-full bg-primary-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? "Verifying..." : "Verify & Enable"}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === "setup-sms" && (
           <div className="bg-white border border-secondary-100 rounded-[2.5rem] p-10 shadow-xl animate-in zoom-in-95 duration-500">
              <button onClick={() => setStep("overview")} className="text-secondary-400 hover:text-secondary-900 mb-6 flex items-center gap-2 font-bold text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back
             </button>
             <h2 className="text-2xl font-black heading-font text-secondary-900 mb-6">Setup SMS Verification</h2>
             
             <div className="space-y-6 max-w-sm">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Phone Number</label>
                   <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full bg-secondary-50 border border-secondary-200 rounded-2xl p-4 text-lg font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-secondary-400 px-1 italic mt-1">Include country code (e.g., +1 for USA)</p>
                </div>
                
                <button 
                  onClick={() => enableMfa("sms")}
                  disabled={loading || phone.length < 10}
                  className="w-full bg-primary-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-500 transition-all active:scale-95 disabled:opacity-50"
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
