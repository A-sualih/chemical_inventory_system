import { useState } from "react";
import Layout from "../layout/Layout";

const Chemicals = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const chemicalData = [
    { id: "C001", name: "Acetone", formula: "C3H6O", grade: "ACS/HPLC", qty: "2.5L", status: "In Stock", location: "Shelf A-12" },
    { id: "C002", name: "Hydrochloric Acid", formula: "HCl", grade: "Technical", qty: "5.0L", status: "Low Stock", location: "Acid Safe 2" },
    { id: "C003", name: "Ethanol 95%", formula: "C2H5OH", grade: "USP", qty: "1.0L", status: "In Stock", location: "Flammables C-4" },
    { id: "C004", name: "Sodium Hydroxide", formula: "NaOH", grade: "AR", qty: "500g", status: "In Stock", location: "Shelf B-2" },
    { id: "C005", name: "Sulfuric Acid", formula: "H2SO4", grade: "ACS", qty: "0.2L", status: "Out of Stock", location: "Acid Safe 1" },
    { id: "C006", name: "Methanol", formula: "CH3OH", grade: "HPLC", qty: "4.0L", status: "In Stock", location: "Flammables C-2" },
    { id: "C007", name: "Dichloromethane", formula: "CH2Cl2", grade: "Anhydrous", qty: "1.2L", status: "Low Stock", location: "Shelf A-5" },
    { id: "C008", name: "Potassium Permanganate", formula: "KMnO4", grade: "AR", qty: "250g", status: "In Stock", location: "Oxidizers D-1" },
  ];

  const filtered = chemicalData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold heading-font text-secondary-900">Chemical Repository</h1>
          <p className="text-secondary-500 text-sm mt-1">Master inventory of all chemical assets</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Entry
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-secondary-100 shadow-xl overflow-hidden mb-6">
        <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search by name, ID or formula..." 
              className="w-full bg-white border border-secondary-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none hover:border-primary-300 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-3.5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-semibold text-secondary-600 hover:bg-white rounded-xl transition-colors">Export .CSV</button>
            <button className="px-4 py-2 text-sm font-semibold text-secondary-600 hover:bg-white rounded-xl transition-colors">Print Batch</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary-50 text-secondary-500 uppercase text-[10px] font-bold tracking-widest border-b border-secondary-100">
                <th className="px-6 py-4">ID / Formula</th>
                <th className="px-6 py-4">Common Name</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Stock level</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-secondary-900 text-sm tracking-tight">{item.id}</div>
                    <div className="text-[10px] text-secondary-400 font-mono mt-0.5">{item.formula}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-semibold text-secondary-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-secondary-100 rounded text-[10px] font-bold text-secondary-600 border border-secondary-200">{item.grade}</span>
                  </td>
                  <td className="px-6 py-5 font-medium text-secondary-800 text-sm">
                    {item.qty}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${
                      item.status === 'In Stock' ? 'text-green-600' : 
                      item.status === 'Low Stock' ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === 'In Stock' ? 'bg-green-500' : 
                        item.status === 'Low Stock' ? 'bg-orange-500' : 'bg-red-500 animate-pulse'
                      }`}></span>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-secondary-500 font-medium italic">
                    {item.location}
                  </td>
                  <td className="px-6 py-5 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-secondary-400 hover:text-primary-600 bg-white rounded-lg border border-secondary-100 shadow-sm transition-all" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button className="p-2 text-secondary-400 hover:text-red-500 bg-white rounded-lg border border-secondary-100 shadow-sm transition-all" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Chemicals;