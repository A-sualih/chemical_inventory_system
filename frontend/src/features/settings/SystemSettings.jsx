import { useState, useEffect } from "react";
import axios from "axios";
import { useSettings } from "../../context/SettingsContext";
import Layout from "../../layout/Layout";
import "./Settings.css";

const SystemSettings = () => {
    const { fetchSettings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ type: "", message: "" });
    const [formData, setFormData] = useState({
        systemName: "",
        systemLogo: "",
        orgName: "",
        defaultTheme: "light",
        defaultNotificationSettings: { email: true, inApp: true },
        contactInfo: { email: "", phone: "" },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get("/api/settings");
                if (res.data) {
                    setFormData({
                        systemName: res.data.systemName || "",
                        systemLogo: res.data.systemLogo || "",
                        orgName: res.data.orgName || "",
                        defaultTheme: res.data.defaultTheme || "light",
                        defaultNotificationSettings: res.data.defaultNotificationSettings || { email: true, inApp: true },
                        contactInfo: res.data.contactInfo || { email: "", phone: "" }
                    });
                }
            } catch (err) {
                setAlert({ type: "error", message: "Failed to load system settings." });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith("notif_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                defaultNotificationSettings: {
                    ...prev.defaultNotificationSettings,
                    [key]: checked
                }
            }));
        } else if (name.startsWith("contact_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                contactInfo: {
                    ...prev.contactInfo,
                    [key]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const uploadData = new FormData();
        uploadData.append("image", file);
        
        try {
            const res = await axios.post("/api/upload", uploadData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.url) {
                setFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
            }
        } catch (err) {
            setAlert({ type: "error", message: "Failed to upload image." });
        }
    };

    const handleSave = async () => {
        try {
            setAlert({ type: "", message: "" });
            // API expects token handled via AuthContext interceptor automatically
            await axios.put("/api/settings", formData);
            await fetchSettings();
            setAlert({ type: "success", message: "System settings updated successfully!" });
        } catch (err) {
            setAlert({ type: "error", message: "Failed to update system settings. Make sure you are an admin." });
        }
    };

    if (loading) return <div className="settings-loading">Loading configuration...</div>;

    return (
        <Layout>
            <div className="settings-container">
                <div className="settings-header">
                <h1>Global System Settings</h1>
                <p>Configure appearance, organization details, and environment defaults applied to all users.</p>
            </div>

            {alert.message && (
                <div style={{ padding: "12px", marginBottom: "20px", borderRadius: "8px", 
                    background: alert.type === "error" ? "#fee2e2" : "#d1fae5",
                    color: alert.type === "error" ? "#991b1b" : "#065f46"
                 }}>
                    {alert.message}
                </div>
            )}

            <div className="settings-section">
                <h2>Branding</h2>
                <div className="settings-grid">
                    <div className="settings-group full-width">
                        <label>Application Title</label>
                        <input 
                            type="text" 
                            name="systemName" 
                            value={formData.systemName} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div className="settings-group full-width">
                        <label>System Logo (Upload Photo)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                            {formData.systemLogo && (
                                <img src={formData.systemLogo} alt="Logo" style={{ width: '45px', height: '45px', objectFit: 'contain', borderRadius: '4px', background: '#f8f9fa', border: '1px solid #dee2e6' }} />
                            )}
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, "systemLogo")} 
                                style={{ flex: 1, padding: '8px' }}
                            />
                        </div>
                    </div>
                    <div className="settings-group full-width">
                        <label>Organization Name (Institution/Lab)</label>
                        <input 
                            type="text" 
                            name="orgName" 
                            value={formData.orgName} 
                            onChange={handleChange} 
                        />
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2>Preferences & Contacts</h2>
                <div className="settings-grid">
                    <div className="settings-group">
                        <label>Default Theme</label>
                        <select name="defaultTheme" value={formData.defaultTheme} onChange={handleChange}>
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                            <option value="system">System Default</option>
                        </select>
                    </div>

                    <div className="settings-group">
                        <label>Contact Email (Support)</label>
                        <input 
                            type="email" 
                            name="contact_email" 
                            value={formData.contactInfo.email} 
                            onChange={handleChange} 
                        />
                    </div>

                    <div className="settings-group full-width">
                        <label>Default Notification Settings</label>
                        <div className="settings-checkbox-wrap">
                            <input 
                                type="checkbox" 
                                name="notif_email" 
                                id="notif_email"
                                checked={formData.defaultNotificationSettings.email} 
                                onChange={handleChange} 
                            />
                            <label htmlFor="notif_email">Email Notifications</label>
                        </div>
                        <div className="settings-checkbox-wrap">
                            <input 
                                type="checkbox" 
                                name="notif_inApp" 
                                id="notif_inApp"
                                checked={formData.defaultNotificationSettings.inApp} 
                                onChange={handleChange} 
                            />
                            <label htmlFor="notif_inApp">In-App Alerts</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-actions">
                <button className="settings-btn-save" onClick={handleSave}>
                    Save Settings
                </button>
                </div>
            </div>
        </Layout>
    );
};

export default SystemSettings;
