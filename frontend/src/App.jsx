import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Dashboard from "./pages/Dashboard";
import Chemicals from "./pages/Chemicals";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import AdminOnly from "./pages/AdminOnly";
import ChemicalForm from './pages/ChemicalForm';
import Requests from './pages/Requests';
import InventoryLogs from './pages/InventoryLogs';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a silent loading bar
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Role not authorized
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/chemicals" element={
            <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer/Auditor"]}>
              <Chemicals />
            </ProtectedRoute>
          } />
          <Route path="/chemicals/new" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
          <Route path="/chemicals/edit/:id" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician"]}><ChemicalForm /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer/Auditor"]}><Requests /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer/Auditor"]}><InventoryLogs /></ProtectedRoute>} />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={["Admin", "Lab Manager", "Safety Officer", "Viewer/Auditor"]}>
              <Reports />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
