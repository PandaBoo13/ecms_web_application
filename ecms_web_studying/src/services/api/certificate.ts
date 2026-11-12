import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';
import type { CertificateResponse, PublicCertificateResponse } from '../types/certificate';

export const certificateApi = {
  myCertificates: async (): Promise<CertificateResponse[]> =>
    (await api.get<RequestResponse<CertificateResponse[]>>(API_ENDPOINT.CERTIFICATE_MY)).data.data,

  fileUrl: (certificateId: number) => API_ENDPOINT.CERTIFICATE_MY_FILE(certificateId),
};

export const publicCertificateApi = {
  verify: async (code: string): Promise<PublicCertificateResponse> =>
    (await api.get<RequestResponse<PublicCertificateResponse>>(
      API_ENDPOINT.PUBLIC_CERTIFICATE_VERIFY(code),
    )).data.data,
};
