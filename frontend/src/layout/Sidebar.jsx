import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-5">
      <h2 className="text-2xl font-bold mb-6">CIMS</h2>

      <ul className="space-y-4">
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/chemicals">Chemicals</Link></li>
        <li><Link to="/login">Login</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;