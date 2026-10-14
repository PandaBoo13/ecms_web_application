import { ROLE } from '@/constants/roles';
import type { UserInfo } from '@/services/types/user';

export const hasRole = (user: UserInfo | null, role: string): boolean =>
  user?.roleCode === role;

export const isAdmin = (user: UserInfo | null): boolean => hasRole(user, ROLE.ADMIN);
export const isInstructor = (user: UserInfo | null): boolean => hasRole(user, ROLE.INSTRUCTOR);
export const isStudent = (user: UserInfo | null): boolean => hasRole(user, ROLE.STUDENT);

export const hasAnyRole = (user: UserInfo | null, roles: string[]): boolean => {
  if (!user?.roleCode) return false;
  return roles.includes(user.roleCode);
};