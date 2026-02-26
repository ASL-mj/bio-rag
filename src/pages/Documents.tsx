/**
 * Documents Management Page
 * 管理用户的所有文档
 */
import React, { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Upload,
  message,
  Space,
  Typography,
  Tag,
  Modal,
  Card,
  Empty,
  Progress,
  List,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps, TableColumnsType, UploadFile } from 'antd';
import { documentsApi, DocumentInfo, BatchUploadResult } from '@/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [batchUploadModalVisible, setBatchUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<BatchUploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.list();
      setDocuments(data);
    } catch (err: any) {
      message.error('加载文档失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: async (file) => {
      const supportedExtensions = ['pdf', 'docx', 'doc', 'txt', 'md'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();

      if (!supportedExtensions.includes(fileExt)) {
        message.error('只支持 PDF、DOCX、DOC、TXT、MD 格式');
        return false;
      }

      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB');
        return false;
      }

      setUploading(true);
      try {
        await documentsApi.upload(file);
        message.success('文档上传成功');
        loadDocuments();
      } catch (err: any) {
        message.error(err.response?.data?.detail || '上传失败');
      } finally {
        setUploading(false);
      }

      return false;
    },
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个文档吗？此操作不可恢复，文档将从所有知识库中移除。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await documentsApi.delete(id);
          message.success('删除成功');
          loadDocuments();
        } catch (err: any) {
          message.error('删除失败');
        }
      },
    });
  };

  const batchUploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const supportedExtensions = ['pdf', 'docx', 'doc', 'txt', 'md'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();

      if (!supportedExtensions.includes(fileExt)) {
        message.error(`${file.name}: 只支持 PDF、DOCX、DOC、TXT、MD 格式`);
        return false;
      }

      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error(`${file.name}: 文件大小不能超过 50MB`);
        return false;
      }

      setFileList((prev) => [...prev, file as UploadFile]);
      return false;
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  const handleBatchUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    setBatchUploading(true);
    try {
      const files = fileList.map((f) => f as unknown as File);
      const result = await documentsApi.batchUpload(files);
      
      setUploadResults(result.results);
      setShowResults(true);
      
      if (result.failed_count === 0) {
        message.success(`成功上传 ${result.success_count} 个文档`);
      } else {
        message.warning(`上传完成：成功 ${result.success_count} 个，失败 ${result.failed_count} 个`);
      }
      
      loadDocuments();
      setFileList([]);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '批量上传失败');
    } finally {
      setBatchUploading(false);
    }
  };

  const handleCloseBatchModal = () => {
    setBatchUploadModalVisible(false);
    setFileList([]);
    setShowResults(false);
    setUploadResults([]);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待处理' },
      processing: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
    };
    const config = statusMap[status] || statusMap.pending;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: TableColumnsType<DocumentInfo> = [
    {
      title: '文档名称',
      dataIndex: 'original_filename',
      key: 'original_filename',
      render: (text: string) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '分块数',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      render: (count: number) => <Tag color="blue">{count} 个</Tag>,
    },
    {
      title: '所属知识库',
      dataIndex: 'knowledge_base_count',
      key: 'knowledge_base_count',
      render: (count: number) => <Tag color="purple">{count} 个</Tag>,
    },
    {
      title: '上传时间',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DocumentInfo) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <div style={{ 
      padding: '24px', 
      background: '#f5f5f5', 
      height: '100vh',
      overflow: 'auto'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>文档管理</Title>
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setBatchUploadModalVisible(true)}
              size="large"
            >
              批量上传
            </Button>
            <Upload {...uploadProps}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploading}
                size="large"
              >
                上传文档
              </Button>
            </Upload>
          </Space>
        </div>
        
        <Card>

          {documents.length === 0 && !loading ? (
            <Empty
              description="还没有文档"
              image={<FileTextOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
            >
              <Upload {...uploadProps}>
                <Button type="primary" icon={<UploadOutlined />}>
                  上传第一个文档
                </Button>
              </Upload>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={documents}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个文档`,
              }}
            />
          )}
        </Card>

        {/* 批量上传模态框 */}
        <Modal
          title="批量上传文档"
          open={batchUploadModalVisible}
          onCancel={handleCloseBatchModal}
          footer={
            showResults ? (
              <Button type="primary" onClick={handleCloseBatchModal}>
                关闭
              </Button>
            ) : (
              <>
                <Button onClick={handleCloseBatchModal}>取消</Button>
                <Button
                  type="primary"
                  onClick={handleBatchUpload}
                  loading={batchUploading}
                  disabled={fileList.length === 0}
                >
                  开始上传 ({fileList.length} 个文件)
                </Button>
              </>
            )
          }
          width={700}
        >
          {!showResults ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  支持的文件类型：PDF、DOCX、DOC、TXT、MD。单个文件不超过 50MB，建议每次上传不超过 10 个文件。
                </Text>
              </div>
              <Upload.Dragger {...batchUploadProps}>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持批量选择多个文件
                </p>
              </Upload.Dragger>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <Text strong>上传结果</Text>
              </div>
              <List
                dataSource={uploadResults}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        item.success ? (
                          <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        )
                      }
                      title={item.filename}
                      description={
                        item.success ? (
                          <Text type="success">上传成功 (ID: {item.document_id})</Text>
                        ) : (
                          <Text type="danger">{item.error}</Text>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          )}
        </Modal>
      </div>
    </div>
  );
};
