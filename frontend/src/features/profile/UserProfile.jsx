import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../layout/Layout";
import { 
    UserIcon, 
    PhoneIcon, 
    ShieldCheckIcon, 
    BellAlertIcon, 
    CheckCircleIcon,
    UserCircleIcon,
    EnvelopeIcon
} from "@heroicons/react/24/outline";
import "./Profile.css";

const UserProfile = () => {
    const { user, updateUserContext } = useAuth();
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ type: "", message: "" });
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        profile_photo: "",
        mfa_enabled: false,
        email_preferences: {
            alerts: true,
            updates: false
        }
    });

    useEffect(() => {
        if (alert.message) {
            const timer = setTimeout(() => {
                setAlert({ type: "", message: "" });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const res = await axios.get("/api/profile/me");
                const data = res.data;
                setFormData({
                    name: data.name || "",
                    phone: data.phone || "",
                    profile_photo: data.profile_photo || "",
                    mfa_enabled: data.mfa_enabled || false,
                    email_preferences: data.email_preferences || { alerts: true, updates: false }
                });
            } catch (err) {
                setAlert({ type: "error", message: "Failed to load identity matrix." });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === "mfa_enabled") {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name.startsWith("email_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                email_preferences: {
                    ...prev.email_preferences,
                    [key]: checked
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const uploadData = new FormData();
        uploadData.append("image", file);
        
        try {
            setAlert({ type: "info", message: "Uploading asset..." });
            const res = await axios.post("/api/upload", uploadData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.url) {
                setFormData(prev => ({ ...prev, profile_photo: res.data.url }));
                setAlert({ type: "success", message: "Identity photo updated successfully." });
            }
        } catch (err) {
            setAlert({ type: "error", message: "Asset upload failed over secure connection." });
        }
    };

    const handleSave = async () => {
        try {
            setAlert({ type: "", message: "" });
            await axios.put("/api/profile/me", formData);
            if (updateUserContext) {
                updateUserContext({ name: formData.name, phone: formData.phone, profile_photo: formData.profile_photo });
            }
            setAlert({ type: "success", message: "User identity synchronized successfully!" });
        } catch (err) {
            setAlert({ type: "error", message: "Authentication required to modify core identity parameters." });
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="profile-loader-box">
                    <div className="spinner-profile"></div>
                    <p style={{color: 'var(--secondary-500)', fontWeight: 600}}>Synchronizing Identity Credentials...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="profile-page-wrapper">
                <div className="bg-blob blob-1"></div>
                <div className="bg-blob blob-2"></div>

                <div className="profile-header-premium">
                    <div className="profile-header-icon-box">
                        <UserCircleIcon style={{ width: '2rem', height: '2rem' }} />
                    </div>
                    <div>
                        <h1>User Identity</h1>
                        <p>Manage your secure access credentials, notifications, and core parameters.</p>
                    </div>
                </div>

                {alert.message && (
                    <div className="toast-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
                        <div style={{
                            padding: '1rem 2rem', 
                            borderRadius: '1rem', 
                            background: alert.type === 'error' ? '#ef4444' : (alert.type === 'info' ? '#3b82f6' : '#10b981'),
                            color: 'white',
                            fontWeight: 700,
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                            display: 'flex', gap: '0.75rem', alignItems: 'center'
                        }}>
                            {alert.message}
                        </div>
                    </div>
                )}

                <div className="profile-card">
                    <div className="profile-section-heading">
                        <UserIcon style={{ width: '1.25rem', color: 'var(--primary-600)' }} />
                        <h2>Personal Identity</h2>
                    </div>
                    
                    <div className="profile-form-layout">
                        <div className="profile-group wide">
                            <label>Identity Photo</label>
                            <div className="photo-upload-container">
                                <div className="photo-preview">
                                    {formData.profile_photo ? (
                                        <img src={formData.profile_photo} alt="Profile" />
                                    ) : (
                                        <div className="photo-preview-placeholder">
                                            {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileUpload} 
                                    className="file-input-stylish"
                                />
                            </div>
                        </div>

                        <div className="profile-group">
                            <label>Full Name</label>
                            <div className="profile-input-wrapper">
                                <UserIcon className="profile-input-icon" style={{width: '1.25rem'}} />
                                <input 
                                    type="text" 
                                    name="name" 
                                    className="profile-input"
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        <div className="profile-group">
                            <label>Secure Phone Registry</label>
                            <div className="profile-input-wrapper">
                                <PhoneIcon className="profile-input-icon" style={{width: '1.25rem'}} />
                                <input 
                                    type="tel" 
                                    name="phone" 
                                    className="profile-input"
                                    value={formData.phone} 
                                    onChange={handleChange} 
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-card">
                    <div className="profile-section-heading">
                        <ShieldCheckIcon style={{ width: '1.25rem', color: 'var(--primary-600)' }} />
                        <h2>Security Protocol</h2>
                    </div>
                    <div className="profile-form-layout" style={{ padding: '1.5rem 2rem' }}>
                        <div className={`pref-card ${formData.mfa_enabled ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, mfa_enabled: !p.mfa_enabled}))}>
                            <input 
                                type="checkbox" 
                                name="mfa_enabled" 
                                className="pref-checkbox"
                                checked={formData.mfa_enabled} 
                                onChange={handleChange} 
                                onClick={e => e.stopPropagation()}
                            />
                            <div style={{ flex: 1 }}>
                                <label className="pref-label">Multi-Factor Authentication (MFA)</label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--secondary-500)', marginTop: '0.25rem' }}>Require an SMS or App code on every login.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-card">
                    <div className="profile-section-heading">
                        <BellAlertIcon style={{ width: '1.25rem', color: 'var(--primary-600)' }} />
                        <h2>Notification Architecture</h2>
                    </div>
                    <div className="profile-form-layout" style={{ padding: '1.5rem 2rem' }}>
                        <div className="pref-grid">
                            <div className={`pref-card ${formData.email_preferences.alerts ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, email_preferences: {...p.email_preferences, alerts: !p.email_preferences.alerts}}))}>
                                <input 
                                    type="checkbox" 
                                    className="pref-checkbox"
                                    checked={formData.email_preferences.alerts} 
                                    onChange={e => handleChange({target: {name: 'email_alerts', checked: e.target.checked}})} 
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <label className="pref-label">System Threat Alerts</label>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Critical inventory & threshold warnings</p>
                                </div>
                            </div>
                            
                            <div className={`pref-card ${formData.email_preferences.updates ? 'active' : ''}`} onClick={() => setFormData(p => ({...p, email_preferences: {...p.email_preferences, updates: !p.email_preferences.updates}}))}>
                                <input 
                                    type="checkbox" 
                                    className="pref-checkbox"
                                    checked={formData.email_preferences.updates} 
                                    onChange={e => handleChange({target: {name: 'email_updates', checked: e.target.checked}})} 
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <label className="pref-label">Release Updates</label>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary-500)' }}>Patch notes and new feature announcements</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions-bar">
                    <button className="btn-profile-save" onClick={handleSave}>
                        <CheckCircleIcon style={{ width: '1.5rem' }} />
                        Commit Data Protocol
                    </button>
                </div>

            </div>
        </Layout>
    );
};

export default UserProfile;
