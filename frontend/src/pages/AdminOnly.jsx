import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";

const AdminOnlyPage = ({ title, description }) => {
  const { user, hasPermission } = useAuth();

  if (!hasPermission("roles:manage")) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-bold heading-font text-secondary-900">{title}</h1>
        <p className="text-secondary-500 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Role Configuration</h2>
          <div className="space-y-4">
             {["Admin", "Lab Manager", "Lab Technician", "Safety Officer", "Viewer"].map(role => (
               <div key={role} className="flex items-center justify-between p-4 bg-secondary-50 rounded-2xl">
                 <span className="font-semibold">{role}</span>
                 <button className="text-primary-600 text-xs font-bold hover:underline">Edit Perms</button>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-secondary-950 p-8 rounded-[2.5rem] text-white">
          <h2 className="text-lg font-bold mb-4">System Alerts</h2>
          <p className="text-secondary-400 text-sm">Security protocols are active. All role changes are logged in the master audit trail.</p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminOnlyPage;
