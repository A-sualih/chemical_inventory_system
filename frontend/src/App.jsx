function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border-t-8 border-indigo-600">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-4 animate-bounce">
          Tailwind CSS 4.0
        </h1>

        <p className="text-gray-600 mb-6">
          If you see this styled box, Tailwind is installed correctly.
        </p>

        <button className="bg-green-50 hover:bg-green-600 text-white px-6 py-2 rounded-lg">
          Test Button
        </button>
      </div>
    </div>
  );
}

export default App;