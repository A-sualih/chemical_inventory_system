import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../layout/Layout";
import "./Profile.css";

const UserProfile = () => {
    const { user } = useAuth();
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
                setAlert({ type: "error", message: "Failed to load profile data." });
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
            const res = await axios.post("/api/upload", uploadData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.url) {
                setFormData(prev => ({ ...prev, profile_photo: res.data.url }));
            }
        } catch (err) {
            setAlert({ type: "error", message: "Failed to upload profile photo." });
        }
    };

    const handleSave = async () => {
        try {
            setAlert({ type: "", message: "" });
            await axios.put("/api/profile/me", formData);
            setAlert({ type: "success", message: "Profile updated successfully!" });
        } catch (err) {
            setAlert({ type: "error", message: "Failed to update profile." });
        }
    };

    if (loading) {
        return <div className="profile-loading">Loading profile...</div>;
    }

    return (
        <Layout>
            <div className="profile-container">
                <div className="profile-header">
                <h1>My Profile</h1>
                <p>Manage your account settings, contact information, and preferences.</p>
            </div>

            {alert.message && (
                <div className={`profile-alert ${alert.type}`}>
                    {alert.message}
                </div>
            )}

            <div className="profile-form-grid">
                <div className="profile-form-group">
                    <label>Full Name</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                    />
                </div>
                <div className="profile-form-group">
                    <label>Phone Number</label>
                    <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        placeholder="+1 (555) 000-0000"
                    />
                </div>

                <div className="profile-form-group full-width">
                    <label>Profile Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {formData.profile_photo ? (
                            <img src={formData.profile_photo} alt="Profile" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #dee2e6' }} />
                        ) : (
                            <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d', fontWeight: 'bold', fontSize: '20px' }}>
                                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload} 
                            style={{ flex: 1, padding: '8px' }}
                        />
                    </div>
                </div>

                <div className="profile-form-group">
                    <label>Multi-Factor Authentication</label>
                    <div className="profile-checkbox">
                        <input 
                            type="checkbox" 
                            name="mfa_enabled" 
                            id="mfa_enabled"
                            checked={formData.mfa_enabled} 
                            onChange={handleChange} 
                        />
                        <label htmlFor="mfa_enabled">Require codes on login</label>
                    </div>
                </div>

                <div className="profile-form-group">
                    <label>Email Preferences</label>
                    <div className="profile-checkbox">
                        <input 
                            type="checkbox" 
                            name="email_alerts" 
                            id="email_alerts"
                            checked={formData.email_preferences.alerts} 
                            onChange={handleChange} 
                        />
                        <label htmlFor="email_alerts">System alerts & notifications</label>
                    </div>
                    <div className="profile-checkbox">
                        <input 
                            type="checkbox" 
                            name="email_updates" 
                            id="email_updates"
                            checked={formData.email_preferences.updates} 
                            onChange={handleChange} 
                        />
                        <label htmlFor="email_updates">News and updates</label>
                    </div>
                </div>
            </div>

            <div className="profile-actions">
                <button className="profile-btn-save" onClick={handleSave}>
                    Save Changes
                </button>
                </div>
            </div>
        </Layout>
    );
};

export default UserProfile;
