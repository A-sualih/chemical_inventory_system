import Layout from "../layout/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2>Total Chemicals</h2>
          <p className="text-xl font-bold">120</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Low Stock</h2>
          <p className="text-yellow-500 font-bold">5</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2>Expired</h2>
          <p className="text-red-500 font-bold">2</p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;