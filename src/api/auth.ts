/**
 * Authentication API
 */
import { apiClient } from './client';

// ============= Types =============
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  full_name?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ============= API Functions =============
export const authApi = {
  /**
   * 用户注册
   */
  register: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/api/v1/auth/register', data);
    return response.data;
  },

  /**
   * 用户登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/v1/auth/me');
    return response.data;
  },

  /**
   * 认证服务健康检查
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await apiClient.get('/api/v1/auth/health');
    return response.data;
  },
};
