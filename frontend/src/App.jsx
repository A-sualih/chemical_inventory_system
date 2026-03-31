import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Chemicals from "./pages/Chemicals";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chemicals" element={<Chemicals />} />
        <Route path="/login" element={<Login/>}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;