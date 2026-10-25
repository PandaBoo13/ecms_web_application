import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type { NotificationResponse, NotificationSearchRequest } from '../types/notification';

export const notificationApi = {
  getMyInbox: async (
    params?: NotificationSearchRequest
  ): Promise<PageResponse<NotificationResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<NotificationResponse>>>(
      API_ENDPOINT.NOTIFICATIONS,
      { params }
    );
    return data.data;
  },

  getDetail: async (id: number): Promise<NotificationResponse> => {
    const { data } = await api.get<RequestResponse<NotificationResponse>>(
      API_ENDPOINT.NOTIFICATION_DETAIL(id)
    );
    return data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get<RequestResponse<number>>(
      API_ENDPOINT.NOTIFICATIONS_UNREAD_COUNT
    );
    return data.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.patch(API_ENDPOINT.NOTIFICATION_MARK_READ(id));
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch(API_ENDPOINT.NOTIFICATION_MARK_ALL_READ);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.NOTIFICATION_DELETE(id));
  },

  deleteAll: async (): Promise<void> => {
    await api.delete(API_ENDPOINT.NOTIFICATION_DELETE_ALL);
  },
};