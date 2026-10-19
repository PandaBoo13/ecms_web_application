import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';

export const aiAgentApi = {
  chat: async (message: string): Promise<string> => {
    const { data } = await api.post<RequestResponse<string>>(
      API_ENDPOINT.AI_AGENT_CHAT,
      { message },
      { timeout: 60000 }   // AI có thể chậm hơn REST thường
    );
    return data.data;
  },
};