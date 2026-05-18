import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "";


axios.defaults.baseURL = baseURL;


const API = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cims_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("cims_token");
      localStorage.removeItem("cims_user");

    }
    return Promise.reject(error);
  }
);

export default API;
