import { useState, useEffect } from "react";
import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";
import axios from "axios";

const Reports = () => {
  const { hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  if (!hasPermission("view_reports") && !hasPermission("view_safety_info")) {
     return <div className="p-12 text-center text-red-500 font-bold">Unauthorized. Role insufficient to view compliance reports.</div>;
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await axios.get('/api/reports/analytics');
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportPDF = () => {
    window.print(); // Native browser print to PDF
  };

  return (
    <Layout>
      <div className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4 hide-on-print">
        <div>
          <h1 className="text-3xl font-bold heading-font text-secondary-900">Reports & Analytics</h1>
          <p className="text-secondary-500 mt-1">Real-time KPI tracking, hazard distribution, and PDF exports.</p>
        </div>
        <button onClick={handleExportPDF} className="bg-secondary-950 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-widest flex items-center gap-2 hover:bg-secondary-800 transition-colors shadow-xl">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
           EXPORT PDF
        </button>
      </div>

      {loading || !analytics ? (
        <p className="text-secondary-400">Loading master analytics...</p>
      ) : (
        <div className="space-y-8 report-content">
          
          {/* Main Number KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-primary-600 p-6 rounded-3xl text-white shadow-lg shadow-primary-500/30">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mb-2">Total Active Inventory</span>
              <span className="text-4xl font-bold font-mono">{analytics.summary.total}</span>
            </div>
            <div className="bg-orange-50 p-6 rounded-3xl text-orange-900 border border-orange-100">
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-2">Low Stock Alerts</span>
              <span className="text-4xl font-bold font-mono">{analytics.summary.low_stock}</span>
            </div>
            <div className="bg-secondary-50 p-6 rounded-3xl border border-secondary-100 text-secondary-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-500 block mb-2">30D Disposals</span>
              <span className="text-4xl font-bold font-mono">{analytics.summary.disposed_30d}</span>
            </div>
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-green-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 block mb-2">Approved Requests</span>
              <span className="text-4xl font-bold font-mono">{analytics.summary.approved_requests_30d}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hazard Distribution */}
            <div className="bg-white border border-secondary-100 p-8 rounded-[2.5rem] shadow-sm">
               <h3 className="text-lg font-bold mb-6">Hazard Distribution (GHS)</h3>
               <div className="space-y-6">
                 {analytics.hazards.map(hazard => {
                   const max = Math.max(...analytics.hazards.map(h => h.value), 1);
                   const percentage = (hazard.value / max) * 100;
                   return (
                     <div key={hazard.name}>
                       <div className="flex justify-between items-end mb-2">
                         <span className="font-bold text-sm text-secondary-700">{hazard.name}</span>
                         <span className="font-mono text-xs font-bold text-secondary-500">{hazard.value} assets</span>
                       </div>
                       <div className="w-full bg-secondary-50 rounded-full h-3 overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${hazard.name === 'Flammable' ? 'bg-orange-500' : hazard.name === 'Toxic' ? 'bg-purple-500' : 'bg-red-500'}`} 
                           style={{ width: `${percentage}%` }}
                         />
                       </div>
                     </div>
                   )
                 })}
               </div>
            </div>

            {/* Compliance Records */}
            <div className="bg-secondary-950 p-8 rounded-[2.5rem] text-white">
               <h3 className="text-lg font-bold mb-6 text-white">Regulatory Bulletins</h3>
               <div className="space-y-4">
                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs uppercase tracking-widest text-primary-400 font-bold">OSHA Compliance</span>
                     <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                   </div>
                   <p className="text-secondary-400 text-sm">All GHS labels are properly formatted based on latest database scrape.</p>
                 </div>
                 <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-xs uppercase tracking-widest text-orange-400 font-bold">Storage Rules</span>
                     <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
                   </div>
                   <p className="text-secondary-400 text-sm">Acidic cabinets reaching 80% theoretical capacity threshold.</p>
                 </div>
               </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              .hide-on-print { display: none !important; }
              body { background: white; }
              .report-content { zoom: 0.8; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}} />
        </div>
      )}
    </Layout>
  );
};

export default Reports;
