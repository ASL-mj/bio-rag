/**
 * Stats API
 */
import { apiClient } from './client';

// ============= Types =============
export interface StatsInfo {
  total_sessions: number;
  total_messages: number;
  total_files: number;
}

// ============= API Functions =============
export const statsApi = {
  /**
   * 获取系统统计信息
   */
  getStats: async (): Promise<StatsInfo> => {
    const response = await apiClient.get<StatsInfo>('/api/v1/stats');
    return response.data;
  },
};
