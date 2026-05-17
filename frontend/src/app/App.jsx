import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { SettingsProvider } from "../context/SettingsContext";
import { Toaster } from "react-hot-toast";
import Dashboard from "../pages/Dashboard";
import Chemicals from "../features/chemicals/Chemicals";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../features/auth/ResetPassword";
import Reports from "../pages/Reports";
import AdminOnly from "../features/auth/AdminOnly";
import ChemicalForm from '../features/chemicals/ChemicalForm';
import Requests from '../features/requests/Requests';
import InventoryLogs from '../features/inventory/InventoryLogs';
import MFADemo from "../features/auth/MFADemo";
import MFASetup from "../features/auth/MFASetup";
import ContainerMaster from "../features/containers/ContainerMaster";
import BatchMaster from "../features/batches/BatchMaster";
import ExpiryTracker from "../features/batches/ExpiryTracker";
import Notifications from "../features/notifications/Notifications";
import LocationManager from "../features/containers/LocationManager";
import PrintLabel from "../features/batches/PrintLabel";
import ScanQR from "../features/batches/ScanQR";
import ChemicalDetails from "../features/chemicals/ChemicalDetails";
import SafetyDashboard from "../features/safety/SafetyDashboard";
import ProcurementDashboard from "../features/procurement/ProcurementDashboard";
import WasteDashboard from "../features/waste/WasteDashboard";
import UserProfile from "../features/profile/UserProfile";
import SystemSettings from "../features/settings/SystemSettings";
import SecurityDashboard from "../features/security/SecurityDashboard";
import TransferDashboard from "../features/transfers/TransferDashboard";
import LabManagement from "../features/settings/LabManagement";
import TransactionSystem from "../features/transactions/TransactionSystem";
import IntegrationHub from "../features/connectivity/IntegrationHub";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.some(role => role.toLowerCase() === user.role?.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 10000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '10px',
              },
            }}
          />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              
              {/* Common Protected Routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanQR /></ProtectedRoute>} />
              <Route path="/mfa-demo" element={<MFADemo />} />
              <Route path="/mfa-setup" element={<ProtectedRoute><MFASetup /></ProtectedRoute>} />

              {/* Chemical & Inventory Management */}
              <Route path="/chemicals" element={
                <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}>
                  <Chemicals />
                </ProtectedRoute>
              } />
              <Route path="/chemicals/new" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
              <Route path="/chemicals/edit/:id" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
              <Route path="/chemicals/details/:id" element={<ProtectedRoute><ChemicalDetails /></ProtectedRoute>} />
              <Route path="/print/:id" element={<ProtectedRoute><PrintLabel /></ProtectedRoute>} />
              
              {/* Logistics & Batches */}
              <Route path="/containers" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}><ContainerMaster /></ProtectedRoute>} />
              <Route path="/batches" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}><BatchMaster /></ProtectedRoute>} />
              <Route path="/expiry" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer"]}><ExpiryTracker /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Viewer / Auditor"]}><LocationManager /></ProtectedRoute>} />
              
              {/* Workflow & Auditing */}
              <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer"]}><TransferDashboard /></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute><InventoryLogs /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionSystem /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer", "Viewer / Auditor"]}><Reports /></ProtectedRoute>} />
              
              {/* Specialized Modules */}
              <Route path="/safety" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer", "Viewer / Auditor"]}><SafetyDashboard /></ProtectedRoute>} />
              <Route path="/procurement" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager"]}><ProcurementDashboard /></ProtectedRoute>} />
              <Route path="/waste" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer", "Lab Technician"]}><WasteDashboard /></ProtectedRoute>} />

              {/* Admin & Security Command Center */}
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["Admin"]}><SystemSettings /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute allowedRoles={["Admin"]}><SecurityDashboard /></ProtectedRoute>} />
              <Route path="/lab-management" element={<ProtectedRoute allowedRoles={["Admin"]}><LabManagement /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminOnly title="Master Audit Logs" description="Review all security events." /></ProtectedRoute>} />
              <Route path="/roles" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminOnly title="Role Management" description="Configure permissions." /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager"]}><IntegrationHub /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;




