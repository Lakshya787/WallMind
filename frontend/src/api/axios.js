import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5010/api/v1',
  withCredentials: true,
});

// Intercept responses to handle 401 Unauthorized errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Dispatch an event so AuthContext can catch it and clear user state
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
