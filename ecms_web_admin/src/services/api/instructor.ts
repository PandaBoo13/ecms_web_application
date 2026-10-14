import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';
import type {
  SpecializationResponse,
  SpecializationAddRequest,
} from '../types/instructor';

export const instructorApi = {
  // ============ SELF ============
  getMySpecializations: async (): Promise<SpecializationResponse[]> => {
    const { data } = await api.get<RequestResponse<SpecializationResponse[]>>(
      API_ENDPOINT.MY_SPECIALIZATIONS
    );
    return data.data;
  },

  addMySpecialization: async (payload: SpecializationAddRequest): Promise<SpecializationResponse> => {
    const { data } = await api.post<RequestResponse<SpecializationResponse>>(
      API_ENDPOINT.MY_SPECIALIZATIONS,
      payload
    );
    return data.data;
  },

  removeMySpecialization: async (categoryId: number): Promise<void> => {
    await api.delete(API_ENDPOINT.MY_SPECIALIZATION_DETAIL(categoryId));
  },

  setMyPrimary: async (categoryId: number): Promise<void> => {
    await api.patch(API_ENDPOINT.MY_SPECIALIZATION_PRIMARY(categoryId));
  },

  clearMyPrimary: async (): Promise<void> => {
    await api.delete(API_ENDPOINT.MY_SPECIALIZATION_CLEAR_PRIMARY);
  },

  // ============ ADMIN VIEW ============
  getByAccount: async (accountId: number): Promise<SpecializationResponse[]> => {
    const { data } = await api.get<RequestResponse<SpecializationResponse[]>>(
      API_ENDPOINT.INSTRUCTOR_SPECIALIZATIONS(accountId)
    );
    return data.data;
  },
};