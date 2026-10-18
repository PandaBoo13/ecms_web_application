import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type {
  Student,
  StudentDetail,
  StudentFilterParams,
  StudentCreatePayload,
  StudentUpdatePayload,
  StudentConvertFromLeadPayload,
  StudentStatusChangePayload,
  Guardian,
  GuardianPayload,
  AcademicHistory,
} from '../types/student';

export const studentApi = {
  search: async (
    params?: StudentFilterParams
  ): Promise<PageResponse<Student>> => {
    const { data } = await api.get<RequestResponse<PageResponse<Student>>>(
      API_ENDPOINT.STUDENTS,
      { params }
    );
    return data.data;
  },

  getById: async (id: number): Promise<Student> => {
    const { data } = await api.get<RequestResponse<Student>>(
      API_ENDPOINT.STUDENT_DETAIL(id)
    );
    return data.data;
  },

  getDetailById: async (id: number): Promise<StudentDetail> => {
    const { data } = await api.get<RequestResponse<StudentDetail>>(
      API_ENDPOINT.STUDENT_FULL_DETAIL(id)
    );
    return data.data;
  },

  getByCode: async (code: string): Promise<Student> => {
    const { data } = await api.get<RequestResponse<Student>>(
      API_ENDPOINT.STUDENT_BY_CODE(code)
    );
    return data.data;
  },

  create: async (payload: StudentCreatePayload): Promise<Student> => {
    const { data } = await api.post<RequestResponse<Student>>(
      API_ENDPOINT.STUDENTS,
      payload
    );
    return data.data;
  },

  convertFromLead: async (
    payload: StudentConvertFromLeadPayload
  ): Promise<Student> => {
    const { data } = await api.post<RequestResponse<Student>>(
      API_ENDPOINT.STUDENT_CONVERT_LEAD,
      payload
    );
    return data.data;
  },

  update: async (
    id: number,
    payload: StudentUpdatePayload
  ): Promise<Student> => {
    const { data } = await api.put<RequestResponse<Student>>(
      API_ENDPOINT.STUDENT_DETAIL(id),
      payload
    );
    return data.data;
  },

  updateStatus: async (
    id: number,
    payload: StudentStatusChangePayload
  ): Promise<Student> => {
    const { data } = await api.patch<RequestResponse<Student>>(
      API_ENDPOINT.STUDENT_STATUS(id),
      payload
    );
    return data.data;
  },

  addGuardian: async (
    id: number,
    payload: GuardianPayload
  ): Promise<Guardian> => {
    const { data } = await api.post<RequestResponse<Guardian>>(
      API_ENDPOINT.STUDENT_GUARDIANS(id),
      payload
    );
    return data.data;
  },

  getGuardians: async (id: number): Promise<Guardian[]> => {
    const { data } = await api.get<RequestResponse<Guardian[]>>(
      API_ENDPOINT.STUDENT_GUARDIANS(id)
    );
    return data.data;
  },

  deleteGuardian: async (
    id: number,
    guardianId: number
  ): Promise<void> => {
    await api.delete<RequestResponse<void>>(
      API_ENDPOINT.STUDENT_GUARDIAN_DETAIL(id, guardianId)
    );
  },

  getAcademicHistories: async (id: number): Promise<AcademicHistory[]> => {
    const { data } = await api.get<RequestResponse<AcademicHistory[]>>(
      API_ENDPOINT.STUDENT_ACADEMIC_HISTORIES(id)
    );
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete<RequestResponse<void>>(API_ENDPOINT.STUDENT_DETAIL(id));
  },
};

