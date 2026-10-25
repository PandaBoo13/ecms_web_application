import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';
import type { UserInfo, UpdateProfileRequest } from '../types/user';

export const userApi = {
  getMe: async (): Promise<UserInfo> => {
    const { data } = await api.get<RequestResponse<UserInfo>>(API_ENDPOINT.AUTH_ME);
    return data.data;
  },

  updateMe: async (payload: UpdateProfileRequest): Promise<UserInfo> => {
    const { data } = await api.put<RequestResponse<UserInfo>>(API_ENDPOINT.AUTH_ME, payload);
    return data.data;
  },
};