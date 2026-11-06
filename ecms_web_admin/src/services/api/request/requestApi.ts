// src/services/request/requestApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
// ⚠️ Alias để tránh trùng tên với DTO RequestResponse của module request
import type {
  RequestResponse as ApiRequestResponse,
  PageResponse,
} from '../../types/api';
import type {
  RequestCreateRequest,
  RequestReviewRequest,
  RequestSearchParams,
  RequestResponse,
  RequestDetailResponse,
  RequestConflictPreviewResponse,
} from '../../types/request/request';

/**
 * Request API — 1 controller backend cho TẤT CẢ loại yêu cầu.
 *
 *   POST /api/requests                          → tạo yêu cầu (bất kỳ loại)
 *   GET  /api/requests                          → search / filter
 *   GET  /api/requests/{id}                     → chi tiết
 *   GET  /api/requests/{id}/course-conflicts    → preview conflict (COURSE_REVIEW)
 *   POST /api/requests/{id}/review              → duyệt / từ chối
 *   POST /api/requests/{id}/cancel              → requester tự hủy
 *
 * Wrapper trả về: ApiRequestResponse<{ data }> — unwrap `.data.data`.
 */
export const requestApi = {
  // ============================================================
  // CREATE
  // ============================================================
  create: async (
    payload: RequestCreateRequest,
  ): Promise<RequestDetailResponse> => {
    const { data } = await api.post<ApiRequestResponse<RequestDetailResponse>>(
      API_ENDPOINT.REQUESTS,
      payload,
    );
    return data.data;
  },

  // ============================================================
  // SEARCH — phân trang + filter động
  // ============================================================
  search: async (
    params: RequestSearchParams,
  ): Promise<PageResponse<RequestResponse>> => {
    const { data } = await api.get<ApiRequestResponse<PageResponse<RequestResponse>>>(
      API_ENDPOINT.REQUESTS,
      { params },
    );
    return data.data;
  },

  // ============================================================
  // GET BY ID
  // ============================================================
  getById: async (id: number): Promise<RequestDetailResponse> => {
    const { data } = await api.get<ApiRequestResponse<RequestDetailResponse>>(
      API_ENDPOINT.REQUEST_DETAIL(id),
    );
    return data.data;
  },

  // ============================================================
  // PREVIEW COURSE CONFLICTS — cảnh báo trùng lịch trước khi duyệt
  // Chỉ áp dụng cho request type = COURSE_REVIEW.
  // BE trả hasConflicts=true/false + danh sách conflict.
  // ============================================================
  previewCourseConflicts: async (
    requestId: number,
  ): Promise<RequestConflictPreviewResponse> => {
    const { data } = await api.get<
      ApiRequestResponse<RequestConflictPreviewResponse>
    >(API_ENDPOINT.REQUEST_COURSE_CONFLICTS(requestId));
    return data.data;
  },

  // ============================================================
  // REVIEW — duyệt / từ chối
  // ⚠️ Nếu course OFFLINE có conflict → BE throw HTTP 409,
  //    FE phải bắt lỗi và hiển thị message từ server.
  // ============================================================
  review: async (
    id: number,
    payload: RequestReviewRequest,
  ): Promise<RequestDetailResponse> => {
    const { data } = await api.post<ApiRequestResponse<RequestDetailResponse>>(
      API_ENDPOINT.REQUEST_REVIEW(id),
      payload,
    );
    return data.data;
  },

  // ============================================================
  // CANCEL — requester tự hủy (chỉ được khi PENDING)
  // ============================================================
  cancel: async (id: number): Promise<RequestDetailResponse> => {
    const { data } = await api.post<ApiRequestResponse<RequestDetailResponse>>(
      API_ENDPOINT.REQUEST_CANCEL(id),
    );
    return data.data;
  },
};