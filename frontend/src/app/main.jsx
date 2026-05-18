import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/globals.css'
import App from './App.jsx'
import '../services/api/api' // Centralized Axios config & global baseURL setup

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

