import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type { AuditLogResponse } from '../types/admin';
import type {
  Role,
  Permission,
  AccountResponse,
  AccountPermissionResponse,
  AccountRoleResponse,
} from '../types/user';

export const adminUserApi = {
  search: async (params: Record<string, unknown>): Promise<PageResponse<AccountResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<AccountResponse>>>(
      API_ENDPOINT.RBAC_ACCOUNTS,
      { params }
    );
    return data.data;
  },

  getById: async (id: number): Promise<AccountResponse> => {
    const { data } = await api.get<RequestResponse<AccountResponse>>(
      API_ENDPOINT.RBAC_ACCOUNT_DETAIL(id)
    );
    return data.data;
  },

  getRoles: async (id: number): Promise<AccountRoleResponse[]> => {
    const { data } = await api.get<RequestResponse<AccountRoleResponse[]>>(
      API_ENDPOINT.RBAC_ACCOUNT_ROLES(id)
    );
    return data.data;
  },

  assignRole: async (id: number, roleId: number): Promise<void> => {
    await api.put(API_ENDPOINT.RBAC_ACCOUNT_ROLE(id), { roleId });
  },

  getPermissions: async (id: number): Promise<AccountPermissionResponse[]> => {
    const { data } = await api.get<RequestResponse<AccountPermissionResponse[]>>(
      API_ENDPOINT.RBAC_ACCOUNT_PERMISSIONS(id)
    );
    return data.data;
  },
};

export const adminRoleApi = {
  list: async (): Promise<Role[]> => {
    const { data } = await api.get<RequestResponse<Role[]>>(API_ENDPOINT.RBAC_ROLES);
    return data.data;
  },
  create: async (payload: { code: string; description?: string }): Promise<Role> => {
    const { data } = await api.post<RequestResponse<Role>>(API_ENDPOINT.RBAC_ROLES, payload);
    return data.data;
  },
  update: async (id: number, payload: { code: string; description?: string }): Promise<Role> => {
    const { data } = await api.put<RequestResponse<Role>>(API_ENDPOINT.RBAC_ROLE_DETAIL(id), payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.RBAC_ROLE_DETAIL(id));
  },
};

export const adminPermissionApi = {
  search: async (params?: Record<string, unknown>): Promise<PageResponse<Permission>> => {
    const { data } = await api.get<RequestResponse<PageResponse<Permission>>>(
      API_ENDPOINT.RBAC_PERMISSIONS,
      { params }
    );
    return data.data;
  },
  listAll: async (): Promise<Permission[]> => {
    const { data } = await api.get<RequestResponse<Permission[]>>(API_ENDPOINT.RBAC_PERMISSIONS_ALL);
    return data.data;
  },
  create: async (payload: Partial<Permission>): Promise<Permission> => {
    const { data } = await api.post<RequestResponse<Permission>>(API_ENDPOINT.RBAC_PERMISSIONS, payload);
    return data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.RBAC_PERMISSION_DETAIL(id));
  },
  sync: async (): Promise<string> => {
    const { data } = await api.post<RequestResponse<string>>(API_ENDPOINT.RBAC_PERMISSIONS_SYNC);
    return data.data;
  },
};

export const auditLogApi = {
  search: async (params: Record<string, unknown>): Promise<PageResponse<AuditLogResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<AuditLogResponse>>>(
      API_ENDPOINT.AUDIT_LOGS,
      { params }
    );
    return data.data;
  },
};