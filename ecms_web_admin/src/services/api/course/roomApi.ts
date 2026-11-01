// src/services/course/roomApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../../types/api';
import type { RoomResponse, RoomRequest } from '../../../services/types/course/room';

export const roomApi = {
  listActive: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(
      API_ENDPOINT.ROOMS_ACTIVE);
    return data.data;
  },

  listAll: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(
      API_ENDPOINT.ROOMS);
    return data.data;
  },

  getById: async (id: number): Promise<RoomResponse> => {
    const { data } = await api.get<RequestResponse<RoomResponse>>(
      API_ENDPOINT.ROOM_DETAIL(id));
    return data.data;
  },

  create: async (payload: RoomRequest): Promise<RoomResponse> => {
    const { data } = await api.post<RequestResponse<RoomResponse>>(
      API_ENDPOINT.ROOMS, payload);
    return data.data;
  },

  update: async (id: number, payload: RoomRequest): Promise<RoomResponse> => {
    const { data } = await api.put<RequestResponse<RoomResponse>>(
      API_ENDPOINT.ROOM_DETAIL(id), payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.ROOM_DETAIL(id));
  },
};