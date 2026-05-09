import axios from 'axios';

const api = axios.create({
  baseURL: 'https://smartrack-backend.onrender.com',
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const token = localStorage.getItem('smartattend_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('smartattend_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
