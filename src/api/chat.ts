/**
 * Chat API
 */
import { apiClient } from './client';

// ============= Types =============
export interface ChatRequest {
  session_id: string;
  message: string;
  knowledge_base_ids?: number[] | null;
}

export interface ChatResponse {
  message_id: string;
  content: string;
  agent_steps: Array<Record<string, any>>;
  knowledge_refs: Array<Record<string, any>>;
}

export interface StreamEvent {
  type: 'start' | 'thought' | 'action' | 'action_input' | 'observation' | 'token' | 'done' | 'error';
  content?: string;
  message_id?: number;
  final_answer?: string;
  agent_steps?: Array<Record<string, any>>;
  sources?: Array<Record<string, any>>;
  error?: string;
}

// ============= API Functions =============
export const chatApi = {
  /**
   * 与 Agent 对话（非流式）
   */
  chat: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/api/v1/chat', data);
    return response.data;
  },

  /**
   * 流式对话接口（SSE）
   * 返回一个 EventSource 对象用于接收服务器推送的事件
   */
  chatStream: (data: ChatRequest, onMessage: (event: StreamEvent) => void, onError?: (error: Error) => void) => {
    const token = localStorage.getItem('access_token');
    const url = new URL('/api/v1/chat/stream', apiClient.defaults.baseURL);
    
    // 使用 fetch 进行流式请求
    fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('Response body is null');
        }
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage(data as StreamEvent);
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      })
      .catch((error) => {
        if (onError) {
          onError(error);
        } else {
          console.error('Stream error:', error);
        }
      });
  },

  /**
   * 导出会话为 JSON 格式
   */
  exportSession: async (sessionId: string): Promise<any> => {
    const response = await apiClient.get(`/api/v1/export/${sessionId}`);
    return response.data;
  },
};
