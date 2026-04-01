import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const stats = [
    { label: "Inventory Assets", value: "1,284", trend: "+12.5%", color: "primary", icon: "📦" },
    { label: "Active Requests", value: "18", trend: "Normal", color: "secondary", icon: "📝" },
    { label: "Critical Stock", value: "4", trend: "-2", color: "red", icon: "⚠️" },
    { label: "Safety Score", value: "98.2%", trend: "Optimal", color: "green", icon: "🛡️" },
  ];

  const recentActivity = [
    { user: "Ahmed Sualih", action: "Approved request for Acetone", time: "14 mins ago", code: "REQ-0932" },
    { user: "Amir Mesfin", action: "Updated storage location for HCl", time: "2 hours ago", code: "LOC-4412" },
    { user: "Abu mahi", action: "Automated stock alert: Sulfuric Acid", time: "5 hours ago", code: "ALT-0012" },
    { user: "Tesegazeab", action: "New chemical registered: KMnO4", time: "Yesterday", code: "REG-8821" },
  ];

  return (
    <Layout>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold heading-font text-secondary-900 leading-tight">Welcome back, {user?.name || "Guest"}</h1>
          <p className="text-secondary-500 mt-1">Here is what's happening in the inventory today.</p>
        </div>

        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-secondary-400 uppercase tracking-[0.2em] mb-1">System Status</div>
          <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            All Nodes Operational
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-secondary-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="text-3xl">{stat.icon}</div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                stat.color === 'red' ? 'bg-red-50 text-red-600' : 
                stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-primary-50 text-primary-600'
              }`}>
                {stat.trend}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-secondary-500 mb-1">{stat.label}</h2>
            <div className="text-3xl font-bold text-secondary-900 tracking-tight group-hover:text-primary-600 transition-colors">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-secondary-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <button className="text-primary-600 text-xs font-bold hover:underline">Full Analytics →</button>
          </div>
          <h2 className="text-xl font-bold text-secondary-900 mb-6 heading-font">Inventory Trend (30 Days)</h2>
          <div className="h-64 w-full flex items-end gap-2 pb-2">
            {[40, 65, 45, 90, 65, 45, 75, 55, 80, 45, 90, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-primary-100/50 rounded-t-xl group relative cursor-pointer hover:bg-primary-500 transition-all" style={{ height: `${h}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                  {h} Units
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4 text-[10px] font-bold text-secondary-400 uppercase tracking-widest border-t border-secondary-50">
            <span>March 01</span>
            <span>March 15</span>
            <span>March 31</span>
          </div>
        </div>

        <div className="bg-secondary-950 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary-600/10 rounded-full blur-[80px]"></div>
          
          <h2 className="text-xl font-bold text-white mb-6 heading-font relative z-10">Live Activity</h2>
          <div className="space-y-6 relative z-10">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                <div>
                  <div className="text-sm font-semibold text-white leading-tight">
                    {activity.user}
                  </div>
                  <div className="text-xs text-secondary-400 mt-1 leading-snug">
                    {activity.action}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] font-bold text-secondary-500 uppercase tracking-widest">{activity.time}</span>
                    <span className="text-[9px] font-mono text-primary-400/80 bg-primary-900/40 px-1.5 py-0.5 rounded leading-none">{activity.code}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white hover:text-secondary-950 transition-all">
            View All Audit Logs
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
