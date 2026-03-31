import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <div className="flex bg-secondary-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;