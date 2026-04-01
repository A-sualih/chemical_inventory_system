import Layout from "../layout/Layout";
import { useAuth } from "../AuthContext";

const Reports = () => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission("reports:view")) {
     return <div className="p-12 text-center text-red-500 font-bold">Unauthorized. Role insufficient to view compliance reports.</div>;
  }

  const reports = [
    { title: "Monthly Inventory Audit", date: "Mar 2026", status: "Completed", type: "Audit" },
    { title: "Safety Compliance Check", date: "Mar 15, 2026", status: "Flagged", type: "Safety" },
    { title: "Chemical Consumption Summary", date: "Feb 2026", status: "Archived", type: "Usage" },
    { title: "Expired Asset Disposal Log", date: "Feb 10, 2026", status: "Archived", type: "Safety" },
  ];

  return (
    <Layout>
      <div className="mb-10">
        <h1 className="text-3xl font-bold heading-font text-secondary-900">Compliance Reports</h1>
        <p className="text-secondary-500 mt-1">Generate and analyze inventory and safety data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-secondary-100 group hover:shadow-xl transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4 text-xs font-bold uppercase tracking-widest text-secondary-400">
               <span>{report.type}</span>
               <span className={report.status === "Flagged" ? "text-orange-500" : "text-green-600"}>{report.status}</span>
            </div>
            <h2 className="text-xl font-bold text-secondary-900 mb-2">{report.title}</h2>
            <div className="text-sm text-secondary-500">{report.date}</div>
            <button className="mt-8 text-primary-600 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                Download PDF
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Reports;
