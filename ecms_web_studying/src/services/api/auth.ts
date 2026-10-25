import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../types/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserInfo,
} from '../types/user';

export const authApi = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<RequestResponse<LoginResponse>>(
      API_ENDPOINT.AUTH_LOGIN,
      payload
    );
    return data.data;
  },

  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await api.post<RequestResponse<RegisterResponse>>(
      API_ENDPOINT.AUTH_REGISTER,
      payload
    );
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post(API_ENDPOINT.AUTH_LOGOUT);
  },

  refreshToken: async (): Promise<LoginResponse> => {
    const { data } = await api.post<RequestResponse<LoginResponse>>(
      API_ENDPOINT.AUTH_REFRESH_TOKEN
    );
    return data.data;
  },

  me: async (): Promise<UserInfo> => {
    const { data } = await api.get<RequestResponse<UserInfo>>(API_ENDPOINT.AUTH_ME);
    return data.data;
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<UserInfo> => {
    const { data } = await api.put<RequestResponse<UserInfo>>(
      API_ENDPOINT.AUTH_ME,
      payload
    );
    return data.data;
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
    await api.post(API_ENDPOINT.AUTH_CHANGE_PASSWORD, payload);
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<void> => {
    await api.post(API_ENDPOINT.AUTH_FORGOT_PASSWORD, payload);
  },

  verifyOtp: async (payload: VerifyOtpRequest): Promise<string> => {
    const { data } = await api.post<RequestResponse<string>>(
      API_ENDPOINT.AUTH_VERIFY_OTP,
      payload
    );
    return data.data;
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await api.post(API_ENDPOINT.AUTH_RESET_PASSWORD, payload);
  },
};