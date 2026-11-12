import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type { CertificateEligibleResponse, CertificateResponse } from '../types/certificate';

export const certificateApi = {
  listEligible: async (params: Record<string, unknown> = {}) =>
    (await api.get<RequestResponse<PageResponse<CertificateEligibleResponse>>>(
      API_ENDPOINT.CERTIFICATE_ELIGIBLE, { params },
    )).data.data,

  list: async (params: Record<string, unknown> = {}) =>
    (await api.get<RequestResponse<PageResponse<CertificateResponse>>>(
      API_ENDPOINT.CERTIFICATES, { params },
    )).data.data,

  issue: async (enrollmentId: number, file: File) => {
    const formData = new FormData();
    formData.append('enrollmentId', String(enrollmentId));
    formData.append('file', file);
    return (await api.post<RequestResponse<CertificateResponse>>(
      API_ENDPOINT.CERTIFICATES, formData,
    )).data.data;
  },

  revoke: async (certificateId: number, reason: string) =>
    (await api.post<RequestResponse<CertificateResponse>>(
      API_ENDPOINT.CERTIFICATE_REVOKE(certificateId), { reason },
    )).data.data,

  fileUrl: (certificateId: number) => API_ENDPOINT.CERTIFICATE_FILE(certificateId),
};
