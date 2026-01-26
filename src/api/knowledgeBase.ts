/**
 * Knowledge Base API
 */
import { apiClient } from './client';
import type { DocumentInfo } from './documents';

// ============= Types =============
export interface KnowledgeBaseCreate {
  name: string;
  description?: string | null;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface KnowledgeBaseUpdate {
  name?: string | null;
  description?: string | null;
  chunk_size?: number | null;
  chunk_overlap?: number | null;
}

export interface KnowledgeBaseInfo {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  chunk_size: number;
  chunk_overlap: number;
  collection_name: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseDetail extends KnowledgeBaseInfo {
  document_count: number;
}

export interface AddDocumentToKBRequest {
  document_id: number;
}

export interface BatchAddDocumentsRequest {
  document_ids: number[];
}

export interface BatchAddDocumentsResponse {
  message: string;
  total: number;
  success_count: number;
  failed_count: number;
  errors: string[] | null;
}

// ============= API Functions =============
export const knowledgeBaseApi = {
  /**
   * 创建知识库
   */
  create: async (data: KnowledgeBaseCreate): Promise<KnowledgeBaseInfo> => {
    const response = await apiClient.post<KnowledgeBaseInfo>('/api/v1/knowledge-bases/', data);
    return response.data;
  },

  /**
   * 获取知识库列表
   */
  list: async (skip: number = 0, limit: number = 100): Promise<KnowledgeBaseInfo[]> => {
    const response = await apiClient.get<KnowledgeBaseInfo[]>('/api/v1/knowledge-bases/', {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * 获取知识库详情
   */
  get: async (kbId: number): Promise<KnowledgeBaseDetail> => {
    const response = await apiClient.get<KnowledgeBaseDetail>(`/api/v1/knowledge-bases/${kbId}`);
    return response.data;
  },

  /**
   * 更新知识库
   */
  update: async (kbId: number, data: KnowledgeBaseUpdate): Promise<KnowledgeBaseInfo> => {
    const response = await apiClient.put<KnowledgeBaseInfo>(`/api/v1/knowledge-bases/${kbId}`, data);
    return response.data;
  },

  /**
   * 删除知识库
   */
  delete: async (kbId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/knowledge-bases/${kbId}`);
    return response.data;
  },

  /**
   * 获取知识库的文档列表
   */
  getDocuments: async (kbId: number): Promise<DocumentInfo[]> => {
    const response = await apiClient.get<DocumentInfo[]>(`/api/v1/knowledge-bases/${kbId}/documents`);
    return response.data;
  },

  /**
   * 将文档添加到知识库
   */
  addDocument: async (kbId: number, data: AddDocumentToKBRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/knowledge-bases/${kbId}/documents`, data);
    return response.data;
  },

  /**
   * 从知识库移除文档
   */
  removeDocument: async (kbId: number, documentId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/knowledge-bases/${kbId}/documents/${documentId}`);
    return response.data;
  },

  /**
   * 批量将文档添加到知识库
   */
  batchAddDocuments: async (kbId: number, data: BatchAddDocumentsRequest): Promise<BatchAddDocumentsResponse> => {
    const response = await apiClient.post<BatchAddDocumentsResponse>(
      `/api/v1/knowledge-bases/${kbId}/documents/batch`,
      data
    );
    return response.data;
  },
};
