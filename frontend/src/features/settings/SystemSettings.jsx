import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  PaintBrushIcon, 
  Cog6ToothIcon, 
  BellIcon, 
  ScaleIcon, 
  ExclamationCircleIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import { useSettings } from "../../context/SettingsContext";
import Layout from "../../layout/Layout";
import "./Settings.css";

const SystemSettings = () => {
    const { fetchSettings: refreshGlobalSettings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ type: "", message: "" });
    const [formData, setFormData] = useState({
        systemName: "",
        systemLogo: "",
        landingHero: "",
        favicon: "",
        orgName: "",
        defaultTheme: "light",
        defaultNotificationSettings: { email: true, inApp: true },
        contactInfo: { email: "", phone: "" },
        units: { volume: "L", weight: "kg", temperature: "C" },
        alertThresholds: { lowStockPercent: 10, expiryDaysWarning: 30, hazardLimitAlert: true }
    });

    useEffect(() => {
        if (alert.message) {
            const timer = setTimeout(() => setAlert({ type: "", message: "" }), 5000);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get("/api/settings");
                if (res.data) {
                    setFormData({
                        ...res.data,
                        defaultNotificationSettings: res.data.defaultNotificationSettings || { email: true, inApp: true },
                        contactInfo: res.data.contactInfo || { email: "", phone: "" },
                        units: res.data.units || { volume: "L", weight: "kg", temperature: "C" },
                        alertThresholds: res.data.alertThresholds || { lowStockPercent: 10, expiryDaysWarning: 30, hazardLimitAlert: true }
                    });
                }
            } catch (err) {
                setAlert({ type: "error", message: "Failed to load system configuration protocols." });
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
                defaultNotificationSettings: { ...prev.defaultNotificationSettings, [key]: checked }
            }));
        } else if (name.startsWith("contact_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                contactInfo: { ...prev.contactInfo, [key]: value }
            }));
        } else if (name.startsWith("unit_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                units: { ...prev.units, [key]: value }
            }));
        } else if (name.startsWith("thresh_")) {
            const key = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                alertThresholds: { 
                    ...prev.alertThresholds, 
                    [key]: type === "checkbox" ? checked : (type === "number" ? Number(value) : value) 
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
            setAlert({ type: "info", message: "Uploading asset..." });
            const res = await axios.post("/api/upload", uploadData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.url) {
                setFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
                setAlert({ type: "success", message: "Asset uploaded successfully." });
            }
        } catch (err) {
            setAlert({ type: "error", message: "Upload failed. Please check network connectivity." });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put("/api/settings", formData);
            await refreshGlobalSettings();
            setAlert({ type: "success", message: "Global system parameters updated successfully!" });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setAlert({ type: "error", message: "Authorization failed. Administrator privileges required." });
        }
    };

    if (loading) return (
        <Layout>
            <div className="settings-loading-overlay">
                <div className="modern-spinner"></div>
                <p className="loading-text">Synchronizing Global Settings...</p>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="settings-container">
                {/* Background Decorative Gradient Blobs */}
                <div className="bg-blob blob-1"></div>
                <div className="bg-blob blob-2"></div>
                <div className="bg-blob blob-3"></div>

                <header className="settings-header">
                    <h1>System <span>Administration</span></h1>
                    <p>Configure core environmental parameters, branding, and safety thresholds.</p>
                </header>

                {alert.message && (
                    <div className={`toast-message toast-${alert.type === 'error' ? 'error' : 'success'}`}>
                        {alert.message}
                    </div>
                )}

                <form onSubmit={handleSave}>
                    {/* Branding Section */}
                    <div className="settings-section-card">
                        <div className="settings-section-header">
                            <div className="settings-section-icon"><PaintBrushIcon style={{width: '1.5rem'}} /></div>
                            <h2>Visual Branding</h2>
                        </div>
                        <div className="settings-section-content">
                            <div className="settings-grid">
                                <div className="settings-field-group full-width">
                                    <label className="settings-label">Application Title</label>
                                    <input 
                                        className="settings-input"
                                        type="text" 
                                        name="systemName" 
                                        value={formData.systemName} 
                                        onChange={handleChange}
                                        placeholder="e.g., LabFlow CIMS"
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">System Logo</label>
                                    <div className="file-upload-wrapper">
                                        <div className="preview-image-box">
                                            {formData.systemLogo ? <img src={formData.systemLogo} alt="Logo" /> : <BuildingOfficeIcon style={{width: '1.5rem', color: '#cbd5e1'}} />}
                                        </div>
                                        <input type="file" className="custom-file-input" onChange={(e) => handleFileUpload(e, "systemLogo")} />
                                    </div>
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Landing Page Hero Banner</label>
                                    <div className="file-upload-wrapper" style={{ height: 'auto', minHeight: '80px' }}>
                                        <div className="preview-image-box" style={{ width: '100%', height: '120px', aspectRatio: 'auto' }}>
                                            {formData.landingHero ? <img src={formData.landingHero} alt="Hero Banner" style={{ height: '100%', width: '100%', objectFit: 'cover' }} /> : <PaintBrushIcon style={{width: '2rem', color: '#cbd5e1'}} />}
                                        </div>
                                        <input type="file" className="custom-file-input" onChange={(e) => handleFileUpload(e, "landingHero")} />
                                    </div>
                                    <p className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.5rem' }}>Large scientific illustration or lab photo (16:9 recommended).</p>
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Favicon (.ico, .png)</label>
                                    <div className="file-upload-wrapper">
                                        <div className="preview-image-box" style={{width: '3rem', height: '3rem'}}>
                                            {formData.favicon ? <img src={formData.favicon} alt="Favicon" /> : <GlobeAltIcon style={{width: '1.25rem', color: '#cbd5e1'}} />}
                                        </div>
                                        <input type="file" className="custom-file-input" onChange={(e) => handleFileUpload(e, "favicon")} />
                                    </div>
                                </div>
                                <div className="settings-field-group full-width">
                                    <label className="settings-label">Organization / Lab Name</label>
                                    <input 
                                        className="settings-input"
                                        type="text" 
                                        name="orgName" 
                                        value={formData.orgName} 
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Regional & Contact Section */}
                    <div className="settings-section-card">
                        <div className="settings-section-header">
                            <div className="settings-section-icon"><Cog6ToothIcon style={{width: '1.5rem'}} /></div>
                            <h2>Regional & Support</h2>
                        </div>
                        <div className="settings-section-content">
                            <div className="settings-grid">
                                <div className="settings-field-group">
                                    <label className="settings-label">Default Theme</label>
                                    <select className="settings-select" name="defaultTheme" value={formData.defaultTheme} onChange={handleChange}>
                                        <option value="light">Light Professional</option>
                                        <option value="dark">Deep Night (Dark)</option>
                                        <option value="system">Follow System OS</option>
                                    </select>
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Support Email</label>
                                    <input className="settings-input" type="email" name="contact_email" value={formData.contactInfo.email} onChange={handleChange} />
                                </div>
                                <div className="settings-field-group full-width">
                                    <label className="settings-label">Global Notification Channels</label>
                                    <div className="checkbox-card-grid">
                                        <div className={`checkbox-card ${formData.defaultNotificationSettings.email ? 'active' : ''}`}>
                                            <input type="checkbox" id="n_email" name="notif_email" checked={formData.defaultNotificationSettings.email} onChange={handleChange} />
                                            <label htmlFor="n_email" className="checkbox-card-label">Email Notifications</label>
                                        </div>
                                        <div className={`checkbox-card ${formData.defaultNotificationSettings.inApp ? 'active' : ''}`}>
                                            <input type="checkbox" id="n_app" name="notif_inApp" checked={formData.defaultNotificationSettings.inApp} onChange={handleChange} />
                                            <label htmlFor="n_app" className="checkbox-card-label">In-App Alerts</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Measurement Units */}
                    <div className="settings-section-card">
                        <div className="settings-section-header">
                            <div className="settings-section-icon"><ScaleIcon style={{width: '1.5rem'}} /></div>
                            <h2>Measurement Standards</h2>
                        </div>
                        <div className="settings-section-content">
                            <div className="settings-grid">
                                <div className="settings-field-group">
                                    <label className="settings-label">Volume Unit</label>
                                    <select className="settings-select" name="unit_volume" value={formData.units.volume} onChange={handleChange}>
                                        <option value="L">Liters (L)</option>
                                        <option value="mL">Milliliters (mL)</option>
                                        <option value="gal">Gallons (gal)</option>
                                    </select>
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Weight Unit</label>
                                    <select className="settings-select" name="unit_weight" value={formData.units.weight} onChange={handleChange}>
                                        <option value="kg">Kilograms (kg)</option>
                                        <option value="g">Grams (g)</option>
                                        <option value="lb">Pounds (lb)</option>
                                    </select>
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Temperature Unit</label>
                                    <select className="settings-select" name="unit_temperature" value={formData.units.temperature} onChange={handleChange}>
                                        <option value="C">Celsius (°C)</option>
                                        <option value="F">Fahrenheit (°F)</option>
                                        <option value="K">Kelvin (K)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alert Thresholds */}
                    <div className="settings-section-card">
                        <div className="settings-section-header">
                            <div className="settings-section-icon"><ExclamationCircleIcon style={{width: '1.5rem'}} /></div>
                            <h2>Safety & Stock Thresholds</h2>
                        </div>
                        <div className="settings-section-content">
                            <div className="settings-grid">
                                <div className="settings-field-group">
                                    <label className="settings-label">Low Stock Trigger (%)</label>
                                    <input className="settings-input" type="number" name="thresh_lowStockPercent" value={formData.alertThresholds.lowStockPercent} onChange={handleChange} min="1" max="100" />
                                </div>
                                <div className="settings-field-group">
                                    <label className="settings-label">Expiry Grace Period (Days)</label>
                                    <input className="settings-input" type="number" name="thresh_expiryDaysWarning" value={formData.alertThresholds.expiryDaysWarning} onChange={handleChange} min="1" />
                                </div>
                                <div className="settings-field-group full-width">
                                    <div className={`checkbox-card ${formData.alertThresholds.hazardLimitAlert ? 'active' : ''}`} style={{width: '100%'}}>
                                        <input type="checkbox" id="t_hazard" name="thresh_hazardLimitAlert" checked={formData.alertThresholds.hazardLimitAlert} onChange={handleChange} />
                                        <label htmlFor="t_hazard" className="checkbox-card-label">Enable Automated Hazard Limit Violation Alerts</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="settings-footer-actions">
                        <button type="submit" className="btn-primary-glow">
                            <CheckCircleIcon style={{width: '1.5rem'}} />
                            Commit Global Changes
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default SystemSettings;

