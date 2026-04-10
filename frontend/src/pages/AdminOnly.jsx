import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import axios from "axios";

const AdminOnlyPage = ({ title, description }) => {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!hasPermission("roles:manage")) {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/auth/users');
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert("Error updating role");
    }
  };

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-bold heading-font text-secondary-900">{title}</h1>
        <p className="text-secondary-500 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm max-h-[70vh] overflow-y-auto custom-scrollbar">
          <h2 className="text-lg font-bold mb-4">User Management</h2>
          {loading ? (
             <div className="text-sm text-secondary-400">Loading directory...</div>
          ) : (
            <div className="space-y-4">
               {users.map(u => (
                 <div key={u.id} className="p-4 bg-secondary-50 border border-secondary-100 rounded-2xl">
                   <div className="flex justify-between items-center mb-2">
                     <div>
                       <div className="font-bold text-secondary-900">{u.name}</div>
                       <div className="text-xs text-secondary-500">{u.email}</div>
                     </div>
                     <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {u.status}
                     </span>
                   </div>
                   
                   <div className="mt-3">
                     <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest block mb-1">System Role</label>
                     <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="w-full bg-white border border-secondary-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                        disabled={u.email === 'admin@lab.com'} // Prevent lockout
                     >
                       <option value="Admin">Admin</option>
                       <option value="Lab Manager">Lab Manager</option>
                       <option value="Lab Technician">Lab Technician</option>
                       <option value="Safety Officer">Safety Officer</option>
                       <option value="Viewer / Auditor">Viewer / Auditor</option>
                     </select>
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>
        <div className="bg-secondary-950 p-8 rounded-[2.5rem] text-white">
          <h2 className="text-lg font-bold mb-4">System Access Policies</h2>
          <div className="space-y-4 text-xs">
             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                <strong className="text-primary-400 block mb-1">Admin (Full Control)</strong>
                <p className="text-secondary-400">Highest authority. Can manage chemicals, approve requests, assign roles, and view all reports/logs.</p>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                <strong className="text-primary-400 block mb-1">Lab Manager (Operations)</strong>
                <p className="text-secondary-400">Manages lab activities. Can CRUD chemicals, approve requests, and monitor inventory/reports.</p>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                <strong className="text-primary-400 block mb-1">Lab Technician (Daily User)</strong>
                <p className="text-secondary-400">Works with chemicals. Can create entries, update quantities, and submit requests.</p>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                <strong className="text-primary-400 block mb-1">Safety Officer (Safety Control)</strong>
                <p className="text-secondary-400">Focuses on hazard & compliance. Can view all chemicals, hazard info, and safety reports.</p>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                <strong className="text-primary-400 block mb-1">Viewer / Auditor (Read-Only)</strong>
                <p className="text-secondary-400">External or internal auditor. Can view chemicals, reports, and audit logs without making changes.</p>
             </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminOnlyPage;
