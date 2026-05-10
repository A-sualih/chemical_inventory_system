import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    systemName: "CIMS PRO",
    systemLogo: "",
    orgName: "Managed Stack",
    defaultTheme: "light"
  });

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data) {
        setSettings(res.data);
        if (res.data.systemName) {
          document.title = res.data.systemName;
        }
      }
    } catch (err) {
      console.error('Failed to fetch global settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
