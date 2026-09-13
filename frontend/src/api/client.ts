import axios from 'axios';
import { useAuth } from '../stores/auth.store';

/** Mismo origen: en dev el proxy de Vite manda /api a la API; en prod lo hace nginx. */
export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && useAuth.getState().token) {
      useAuth.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Mensaje legible del backend o genérico. */
export function mensajeError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (!e.response) return 'Sin conexión con el servidor';
  }
  return 'Ocurrió un error inesperado';
}
