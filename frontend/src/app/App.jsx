import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";

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

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // Or a silent loading bar
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.some(role => role.toLowerCase() === user.role?.toLowerCase())) {
    return <Navigate to="/" replace />; // Role not authorized
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/mfa-demo" element={<MFADemo />} />
            <Route path="/mfa-setup" element={<ProtectedRoute><MFASetup /></ProtectedRoute>} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/chemicals" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}>
                <Chemicals />
              </ProtectedRoute>
            } />
            <Route path="/chemicals/new" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
            <Route path="/chemicals/edit/:id" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
            <Route path="/print/:id" element={<ProtectedRoute><PrintLabel /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute><ScanQR /></ProtectedRoute>} />
            <Route path="/chemicals/details/:id" element={<ProtectedRoute><ChemicalDetails /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}><Requests /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}><InventoryLogs /></ProtectedRoute>} />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer", "Viewer / Auditor"]}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/containers" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}>
                <ContainerMaster />
              </ProtectedRoute>
            } />
            <Route path="/batches" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}>
                <BatchMaster />
              </ProtectedRoute>
            } />
            <Route path="/expiry" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer / Auditor"]}>
                <ExpiryTracker />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/audit" element={

              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminOnly title="Master Audit Logs" description="Review all system security events and role modifications." />
              </ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminOnly title="Role Management" description="Assign and configure fine-grained permissions for all personnel." />
              </ProtectedRoute>
            } />
            <Route path="/locations" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager"]}>
                <LocationManager />
              </ProtectedRoute>
            } />
            <Route path="/safety" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer"]}>
                <SafetyDashboard />
              </ProtectedRoute>
            } />
            <Route path="/procurement" element={
              <ProtectedRoute allowedRoles={["Admin", "Lab Manager"]}>
                <ProcurementDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>

    </AuthProvider>

  );
}

export default App;

