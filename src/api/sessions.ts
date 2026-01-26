/**
 * Sessions API
 */
import { apiClient } from './client';

// ============= Types =============
export interface SessionInfo {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AgentIteration {
  iteration: number;
  thought: string;
  action: string;
  action_input: string;
  observation: string;
}

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_steps?: Array<Record<string, any>>;
  sources?: Array<Record<string, any>>;
  iterations?: AgentIteration[];
  created_at: string;
}

// ============= API Functions =============
export const sessionsApi = {
  /**
   * 获取当前用户的会话列表
   */
  getSessions: async (skip: number = 0, limit: number = 50): Promise<SessionInfo[]> => {
    const response = await apiClient.get<SessionInfo[]>('/api/v1/sessions', {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * 获取指定会话的所有消息
   */
  getSessionMessages: async (sessionId: string): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(`/api/v1/sessions/${sessionId}/messages`);
    return response.data;
  },

  /**
   * 删除指定会话及其所有消息
   */
  deleteSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * 更新会话标题
   */
  updateSession: async (sessionId: string, data: { title: string }): Promise<{ message: string; title: string }> => {
    const response = await apiClient.put(`/api/v1/sessions/${sessionId}`, data);
    return response.data;
  },

  /**
   * 导出会话为JSON格式
   */
  exportSession: async (sessionId: string): Promise<any> => {
    const response = await apiClient.get(`/api/v1/export/${sessionId}`);
    return response.data;
  },
};
