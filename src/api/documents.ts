/**
 * Documents API
 */
import { apiClient } from './client';

// ============= Types =============
export interface DocumentInfo {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_hash: string;
  status: string;
  error_message?: string | null;
  chunk_count: number;
  uploaded_at: string;
  processed_at?: string | null;
  knowledge_base_count: number;
}

export interface DocumentUploadResponse {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  status: string;
  message: string;
}

export interface BatchUploadResult {
  filename: string;
  success: boolean;
  document_id: number | null;
  error: string | null;
}

export interface BatchUploadResponse {
  total: number;
  success_count: number;
  failed_count: number;
  results: BatchUploadResult[];
}

// ============= API Functions =============
export const documentsApi = {
  /**
   * 上传文档
   * 支持的文件类型：PDF (.pdf), Word (.docx, .doc), Text (.txt), Markdown (.md)
   */
  upload: async (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<DocumentUploadResponse>(
      '/api/v1/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * 获取文档列表
   */
  list: async (skip: number = 0, limit: number = 100): Promise<DocumentInfo[]> => {
    const response = await apiClient.get<DocumentInfo[]>('/api/v1/documents/', {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * 获取文档详情
   */
  get: async (documentId: number): Promise<DocumentInfo> => {
    const response = await apiClient.get<DocumentInfo>(`/api/v1/documents/${documentId}`);
    return response.data;
  },

  /**
   * 删除文档
   */
  delete: async (documentId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/documents/${documentId}`);
    return response.data;
  },

  /**
   * 批量上传文档
   * 支持的文件类型：PDF (.pdf), Word (.docx, .doc), Text (.txt), Markdown (.md)
   */
  batchUpload: async (files: File[]): Promise<BatchUploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<BatchUploadResponse>(
      '/api/v1/documents/batch-upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
