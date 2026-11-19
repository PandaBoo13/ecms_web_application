import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type {
  Lead,
  LeadDetail,
  LeadFilterParams,
  LeadCreatePayload,
  LeadUpdatePayload,
  LeadAssignPayload,
  LeadInteraction,
  LeadInteractionCreatePayload,
  LeadPlacementTest,
  LeadPlacementTestCreatePayload,
  LeadStatisticsResponse,
} from '../types/lead';

export const leadApi = {
  search: async (params?: LeadFilterParams): Promise<PageResponse<Lead>> => {
    const { data } = await api.get<RequestResponse<PageResponse<Lead>>>(
      API_ENDPOINT.LEADS,
      { params }
    );
    return data.data;
  },

  getById: async (id: number): Promise<Lead> => {
    const { data } = await api.get<RequestResponse<Lead>>(
      API_ENDPOINT.LEAD_DETAIL(id)
    );
    return data.data;
  },

  getDetailById: async (id: number): Promise<LeadDetail> => {
    const { data } = await api.get<RequestResponse<LeadDetail>>(
      API_ENDPOINT.LEAD_FULL_DETAIL(id)
    );
    return data.data;
  },

  create: async (payload: LeadCreatePayload): Promise<Lead> => {
    const { data } = await api.post<RequestResponse<Lead>>(
      API_ENDPOINT.LEADS,
      payload
    );
    return data.data;
  },

  update: async (id: number, payload: LeadUpdatePayload): Promise<Lead> => {
    const { data } = await api.put<RequestResponse<Lead>>(
      API_ENDPOINT.LEAD_DETAIL(id),
      payload
    );
    return data.data;
  },

  assignConsultant: async (
    id: number,
    payload: LeadAssignPayload
  ): Promise<Lead> => {
    const { data } = await api.put<RequestResponse<Lead>>(
      API_ENDPOINT.LEAD_ASSIGN(id),
      payload
    );
    return data.data;
  },

  logInteraction: async (
    id: number,
    payload: LeadInteractionCreatePayload
  ): Promise<LeadInteraction> => {
    const { data } = await api.post<RequestResponse<LeadInteraction>>(
      API_ENDPOINT.LEAD_INTERACTIONS(id),
      payload
    );
    return data.data;
  },

  getInteractions: async (id: number): Promise<LeadInteraction[]> => {
    const { data } = await api.get<RequestResponse<LeadInteraction[]>>(
      API_ENDPOINT.LEAD_INTERACTIONS(id)
    );
    return data.data;
  },

  recordPlacementTest: async (
    id: number,
    payload: LeadPlacementTestCreatePayload
  ): Promise<LeadPlacementTest> => {
    const { data } = await api.post<RequestResponse<LeadPlacementTest>>(
      API_ENDPOINT.LEAD_PLACEMENT_TESTS(id),
      payload
    );
    return data.data;
  },

  getPlacementTests: async (id: number): Promise<LeadPlacementTest[]> => {
    const { data } = await api.get<RequestResponse<LeadPlacementTest[]>>(
      API_ENDPOINT.LEAD_PLACEMENT_TESTS(id)
    );
    return data.data;
  },

  getConsultants: async (): Promise<{ id: number; name: string; email: string }[]> => {
    const { data } = await api.get<RequestResponse<{ id: number; name: string; email: string }[]>>(
      '/api/leads/consultants'
    );
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete<RequestResponse<void>>(API_ENDPOINT.LEAD_DETAIL(id));
  },

  getPerformance: async (): Promise<any> => {
    const { data } = await api.get<RequestResponse<any>>('/api/leads/consultants/performance');
    return data.data;
  },

  getWorkStatus: async (): Promise<{ workStatus: string }> => {
    const { data } = await api.get<RequestResponse<{ workStatus: string }>>('/api/leads/consultants/work-status');
    return data.data;
  },

  updateWorkStatus: async (workStatus: string): Promise<void> => {
    await api.put('/api/leads/consultants/work-status', { workStatus });
  },

  claim: async (leadId: number): Promise<Lead> => {
    const { data } = await api.post<RequestResponse<Lead>>(`/api/leads/${leadId}/claim`);
    return data.data;
  },

  getStatistics: async (params?: { consultantId?: number; startDate?: string; endDate?: string }): Promise<LeadStatisticsResponse> => {
    const { data } = await api.get<RequestResponse<LeadStatisticsResponse>>('/api/leads/statistics/summary', { params });
    return data.data;
  },
};

