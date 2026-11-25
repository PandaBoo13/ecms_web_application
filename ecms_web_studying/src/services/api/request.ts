import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';
import type { RequestCreateRequest } from '../types/request';

export const requestApi = {
  create: async (body: RequestCreateRequest) =>
    (await api.post<RequestResponse<unknown>>(API_ENDPOINT.REQUESTS, body)).data.data,

  /** Học viên tự thu hồi đơn xin nghỉ khi đơn còn chờ duyệt. */
  cancel: async (id: number) =>
    (await api.post<RequestResponse<unknown>>(API_ENDPOINT.REQUEST_CANCEL(id))).data.data,
};
