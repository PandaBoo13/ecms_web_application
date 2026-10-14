import { useAuthStore } from '@/stores/authStore';

/**
 * Hook truy cập auth state.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialized = useAuthStore((s) => s.initialized);

  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const hasRole = useAuthStore((s) => s.hasRole);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isInstructor = useAuthStore((s) => s.isInstructor);
  const isStudent = useAuthStore((s) => s.isStudent);

  return {
    user,
    isAuthenticated,
    isLoading,
    initialized,
    login,
    logout,
    fetchMe,
    setUser,
    clear,
    hasRole,
    isAdmin,
    isInstructor,
    isStudent,
  };
};