import axios from 'axios';

// Use a relative base URL so the Vite dev-server proxy forwards /api/* to
// http://localhost:5000 — this avoids CORS errors entirely.
// In production (same-origin deployment) this also works correctly.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor – surfaces the server error message so the
// UI always shows something meaningful instead of "Network Error".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // No response at all – backend is down or unreachable
      return Promise.reject(new Error('Cannot reach the server. Please make sure the backend is running.'));
    }
    return Promise.reject(error);
  }
);

export default api;
