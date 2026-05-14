import axios from 'axios';

// Create an Axios instance pointing to the FastAPI backend
// Use VITE_API_URL from environment variables if deployed, otherwise fallback to /api for Vercel unified route
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add a request interceptor to inject the JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
