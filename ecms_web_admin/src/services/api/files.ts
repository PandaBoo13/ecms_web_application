import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';

export interface FileUploadResponse {
  url?: string;
  fileUrl?: string;
  path?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  [key: string]: unknown;
}

/** Trích URL ảnh từ response BE (chấp nhận nhiều key phổ biến) */
export const extractFileUrl = (
  res: FileUploadResponse | null | undefined,
): string | undefined => {
  if (!res) return undefined;
  if (typeof res.url === 'string' && res.url) return res.url;
  if (typeof res.fileUrl === 'string' && res.fileUrl) return res.fileUrl;
  if (typeof res.path === 'string' && res.path) return res.path;
  const nested = (res as { data?: FileUploadResponse }).data;
  if (nested) return extractFileUrl(nested);
  return undefined;
};

export const fileApi = {
  upload: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<RequestResponse<FileUploadResponse>>(
      API_ENDPOINT.FILES_UPLOAD,
      formData,
    );
    return data.data;
  },
};