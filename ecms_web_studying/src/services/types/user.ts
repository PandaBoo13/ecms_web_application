import type { RoleCode } from '@/constants/roles';

// ══════════════════════════════════════════════════════════════
// AUTH REQUESTS
// ══════════════════════════════════════════════════════════════

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone?: string;
  roleCode?: string;
  agreedToTerms: boolean;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// ══════════════════════════════════════════════════════════════
// AUTH RESPONSES
// ══════════════════════════════════════════════════════════════

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface RegisterResponse {
  accountId: number;
  email: string;
  fullName: string;
  roleCode: string;
  message: string;
}

export interface UserInfo {
  accountId: number;
  email: string;
  roleCode: RoleCode;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  address?: string;
}

// ══════════════════════════════════════════════════════════════
// RBAC TYPES
// ══════════════════════════════════════════════════════════════

export interface Role {
  id: number;
  code: RoleCode;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: number;
  method: string;
  endpointPattern: string;
  module: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountResponse {
  accountId: number;
  email: string;
  roleId?: number;
  roleCode?: RoleCode;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  isLocked: boolean;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPermissionResponse {
  permissionId: number;
  method: string;
  endpointPattern: string;
  module: string;
  description: string;
  isEnabled: boolean;
  assignedAt: string;
  updatedAt: string;
}

export interface AccountRoleResponse {
  roleId: number;
  code: RoleCode;
  description: string;
}

export interface PermissionCheckResponse {
  accountId: number;
  permissionName?: string;
  resource?: string;
  action?: string;
  hasPermission: boolean;
  message: string;
}

// ══════════════════════════════════════════════════════════════
// RBAC REQUESTS
// ══════════════════════════════════════════════════════════════

export interface RoleRequest {
  code: string;
  description?: string;
}

export interface PermissionRequest {
  method: string;
  endpointPattern: string;
  module?: string;
  description?: string;
}

export interface AssignRoleRequest {
  roleId: number;
}

export interface AssignPermissionRequest {
  permissionId: number;
}

export interface AssignPermissionsBatchRequest {
  permissionIds: number[];
}