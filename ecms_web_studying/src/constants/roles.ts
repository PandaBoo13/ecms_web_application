export const ROLE = {
  ADMIN: 'ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
} as const;

export type RoleCode = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  INSTRUCTOR: 'Giảng viên',
  STUDENT: 'Học viên',
};