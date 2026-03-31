function App() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border-t-8 border-indigo-600">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-4 animate-bounce">
          Tailwind CSS 4.0
        </h1>

        <p className="text-slate-600 mb-8 text-lg">
          If you see this styled card and the bouncing heading, Tailwind is working perfectly!
        </p>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg">
          It Works!
        </button>
      </div>

    </div>
  );
}

export default App;