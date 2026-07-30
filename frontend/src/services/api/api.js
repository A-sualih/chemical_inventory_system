import axios from 'axios'

/**
 * In production (Vercel), call Render API directly.
 * Locally, leave baseURL empty so Vite proxy `/api` → backend works.
 */
const apiOrigin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')

if (apiOrigin) {
  axios.defaults.baseURL = apiOrigin
}

axios.defaults.timeout = 60000

export default axios
