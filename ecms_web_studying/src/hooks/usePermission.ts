import { useAuth } from './useAuth';
import { hasRole, hasAnyRole, isAdmin, isInstructor } from '@/utils/permission';

export const usePermission = () => {
  const { user } = useAuth();

  return {
    hasRole: (role: string) => hasRole(user, role),
    hasAnyRole: (roles: string[]) => hasAnyRole(user, roles),
    isAdmin: () => isAdmin(user),
    isInstructor: () => isInstructor(user),
  };
};