import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Permiso, Rol } from '@bingo/common';

export interface SesionUser {
  id: number;
  username: string;
  rol: Rol;
}

interface AuthState {
  token: string | null;
  user: SesionUser | null;
  permisos: Record<Permiso, boolean> | null;
  login: (token: string, user: SesionUser, permisos: Record<Permiso, boolean>) => void;
  logout: () => void;
  esAdmin: () => boolean;
  tienePermiso: (p: Permiso) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permisos: null,
      login: (token, user, permisos) => set({ token, user, permisos }),
      logout: () => set({ token: null, user: null, permisos: null }),
      esAdmin: () => get().user?.rol === 'admin',
      tienePermiso: (p) => {
        if (get().user?.rol === 'admin') return true;
        return get().permisos?.[p] ?? false;
      },
    }),
    { name: 'bingo-session' },
  ),
);
