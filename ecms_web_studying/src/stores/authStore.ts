import { create } from 'zustand';
import { authApi } from '@/services/api/auth';
import type { LoginRequest, UserInfo } from '@/services/types/user';
import { ROLE } from '@/constants/roles';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;

  login: (payload: LoginRequest) => Promise<UserInfo>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<UserInfo | null>;
  setUser: (user: UserInfo | null) => void;
  clear: () => void;

  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isInstructor: () => boolean;
  isStudent: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialized: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      await authApi.login(payload);
      const user = await authApi.me();
      set({ user, isAuthenticated: true, initialized: true });
      return user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchMe: async () => {
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, initialized: true });
      return user;
    } catch {
      set({ user: null, isAuthenticated: false, initialized: true });
      return null;
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clear: () => set({ user: null, isAuthenticated: false }),

  hasRole: (role) => get().user?.roleCode === role,
  isAdmin: () => get().user?.roleCode === ROLE.ADMIN,
  isInstructor: () => get().user?.roleCode === ROLE.INSTRUCTOR,
  isStudent: () => get().user?.roleCode === ROLE.STUDENT,
}));