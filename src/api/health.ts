/**
 * Health Check API
 */
import { apiClient } from './client';

// ============= API Functions =============
export const healthApi = {
  /**
   * 根路径
   */
  root: async (): Promise<any> => {
    const response = await apiClient.get('/');
    return response.data;
  },

  /**
   * 健康检查
   */
  check: async (): Promise<any> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
