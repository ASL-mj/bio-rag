/**
 * Knowledge Base Detail Page
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  message,
  Space,
  Typography,
  Tag,
  Modal,
  Descriptions,
  Spin,
  Empty,
  List,
  Checkbox,
  Row,
  Col,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { knowledgeBaseApi, documentsApi, KnowledgeBaseDetail as KBDetail, DocumentInfo } from '@/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const KnowledgeBaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [knowledgeBase, setKnowledgeBase] = useState<KBDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  
  // 左侧（可添加）和右侧（已添加）的选中项
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<number[]>([]);
  const [selectedAddedIds, setSelectedAddedIds] = useState<number[]>([]);
  
  // 搜索关键词
  const [availableSearch, setAvailableSearch] = useState('');
  const [addedSearch, setAddedSearch] = useState('');
  
  // 操作中状态
  const [operating, setOperating] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const kbId = parseInt(id);
      const [kbData, docsData, allDocsData] = await Promise.all([
        knowledgeBaseApi.get(kbId),
        knowledgeBaseApi.getDocuments(kbId),
        documentsApi.list(),
      ]);
      setKnowledgeBase(kbData);
      setDocuments(docsData);
      setAllDocuments(allDocsData);
    } catch (err: any) {
      message.error('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 过滤出未在当前知识库中的文档
  const availableDocuments = allDocuments.filter(
    (doc) => !documents.some((d) => d.id === doc.id)
  );

  // 搜索过滤
  const filteredAvailable = availableDocuments.filter((doc) =>
    doc.original_filename.toLowerCase().includes(availableSearch.toLowerCase())
  );

  const filteredAdded = documents.filter((doc) =>
    doc.original_filename.toLowerCase().includes(addedSearch.toLowerCase())
  );

  // 添加文档到知识库
  const handleAddToKB = async () => {
    if (!id || selectedAvailableIds.length === 0) {
      message.warning('请选择要添加的文档');
      return;
    }

    setOperating(true);
    try {
      const kbId = parseInt(id);
      const result = await knowledgeBaseApi.batchAddDocuments(kbId, {
        document_ids: selectedAvailableIds,
      });
      
      if (result.failed_count === 0) {
        message.success(`成功添加 ${result.success_count} 个文档`);
      } else {
        Modal.info({
          title: '批量添加结果',
          content: (
            <div>
              <p>成功：{result.success_count} 个</p>
              <p>失败：{result.failed_count} 个</p>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontWeight: 'bold' }}>错误信息：</p>
                  <ul>
                    {result.errors.map((error, index) => (
                      <li key={index} style={{ color: '#ff4d4f' }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
        });
      }
      
      setSelectedAvailableIds([]);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '添加失败');
    } finally {
      setOperating(false);
    }
  };

  // 从知识库移除文档
  const handleRemoveFromKB = async () => {
    if (!id || selectedAddedIds.length === 0) {
      message.warning('请选择要移除的文档');
      return;
    }

    Modal.confirm({
      title: '确认移除',
      content: `确定要从知识库中移除选中的 ${selectedAddedIds.length} 个文档吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        setOperating(true);
        try {
          const kbId = parseInt(id);
          
          // 批量移除
          await Promise.all(
            selectedAddedIds.map((docId) =>
              knowledgeBaseApi.removeDocument(kbId, docId)
            )
          );
          
          message.success(`成功移除 ${selectedAddedIds.length} 个文档`);
          setSelectedAddedIds([]);
          await loadData();
        } catch (err: any) {
          message.error('移除失败');
        } finally {
          setOperating(false);
        }
      },
    });
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

  const renderDocumentItem = (doc: DocumentInfo, isAdded: boolean) => {
    const isSelected = isAdded
      ? selectedAddedIds.includes(doc.id)
      : selectedAvailableIds.includes(doc.id);

    return (
      <List.Item
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          background: isSelected ? '#e6f7ff' : 'transparent',
          borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
        }}
        onClick={() => {
          if (isAdded) {
            setSelectedAddedIds((prev) =>
              prev.includes(doc.id)
                ? prev.filter((id) => id !== doc.id)
                : [...prev, doc.id]
            );
          } else {
            setSelectedAvailableIds((prev) =>
              prev.includes(doc.id)
                ? prev.filter((id) => id !== doc.id)
                : [...prev, doc.id]
            );
          }
        }}
      >
        <List.Item.Meta
          avatar={
            <Checkbox
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (isAdded) {
                  setSelectedAddedIds((prev) =>
                    e.target.checked
                      ? [...prev, doc.id]
                      : prev.filter((id) => id !== doc.id)
                  );
                } else {
                  setSelectedAvailableIds((prev) =>
                    e.target.checked
                      ? [...prev, doc.id]
                      : prev.filter((id) => id !== doc.id)
                  );
                }
              }}
            />
          }
          title={
            <Space>
              <FileTextOutlined />
              <Text strong>{doc.original_filename}</Text>
            </Space>
          }
          description={
            <Space size="small" wrap>
              <Tag>{doc.file_type.toUpperCase()}</Tag>
              {getStatusTag(doc.status)}
              <Tag color="blue">{doc.chunk_count} 块</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(doc.uploaded_at).format('YYYY-MM-DD HH:mm')}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!knowledgeBase) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="知识库不存在" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      height: '100vh',
      overflow: 'auto',
      background: '#f5f5f5'
    }}>
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/knowledge-bases')}
        >
          返回
        </Button>
      </Space>

      <Card style={{ marginBottom: 24 }}>
        <Title level={3}>{knowledgeBase.name}</Title>
        <Descriptions column={2}>
          <Descriptions.Item label="描述">
            {knowledgeBase.description || '暂无描述'}
          </Descriptions.Item>
          <Descriptions.Item label="文档数量">
            {knowledgeBase.document_count} 个
          </Descriptions.Item>
          <Descriptions.Item label="分块大小">
            {knowledgeBase.chunk_size} 字符
          </Descriptions.Item>
          <Descriptions.Item label="分块重叠">
            {knowledgeBase.chunk_overlap} 字符
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(knowledgeBase.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dayjs(knowledgeBase.updated_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={`文档列表 (${documents.length} 个)`}
        extra={
          <Button
            type="primary"
            onClick={() => setManageModalVisible(true)}
          >
            管理文档
          </Button>
        }
      >
        {documents.length === 0 ? (
          <Empty
            description="还没有文档"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => setManageModalVisible(true)}
            >
              添加文档
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={documents}
            renderItem={(doc) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={<Text strong>{doc.original_filename}</Text>}
                  description={
                    <Space size="small" wrap>
                      <Tag>{doc.file_type.toUpperCase()}</Tag>
                      {getStatusTag(doc.status)}
                      <Tag color="blue">{doc.chunk_count} 块</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(doc.uploaded_at).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* 文档管理模态框 - 左右双列表 */}
      <Modal
        title="管理知识库文档"
        open={manageModalVisible}
        onCancel={() => {
          setManageModalVisible(false);
          setSelectedAvailableIds([]);
          setSelectedAddedIds([]);
          setAvailableSearch('');
          setAddedSearch('');
        }}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        <Row gutter={16}>
          {/* 左侧：可添加的文档 */}
          <Col span={11}>
            <Card
              title={
                <Space>
                  <Text strong>可添加的文档</Text>
                  <Tag color="blue">{filteredAvailable.length}</Tag>
                </Space>
              }
              size="small"
              extra={
                selectedAvailableIds.length > 0 && (
                  <Text type="secondary">已选 {selectedAvailableIds.length} 个</Text>
                )
              }
            >
              <Input
                placeholder="搜索文档名称"
                prefix={<SearchOutlined />}
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
                style={{ marginBottom: 12 }}
                allowClear
              />
              <div style={{ height: 500, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                {filteredAvailable.length === 0 ? (
                  <Empty
                    description={availableSearch ? '没有匹配的文档' : '没有可添加的文档'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginTop: 100 }}
                  >
                    {!availableSearch && (
                      <Button type="primary" onClick={() => navigate('/documents')}>
                        前往上传文档
                      </Button>
                    )}
                  </Empty>
                ) : (
                  <List
                    dataSource={filteredAvailable}
                    renderItem={(doc) => renderDocumentItem(doc, false)}
                    split={false}
                  />
                )}
              </div>
            </Card>
          </Col>

          {/* 中间：操作按钮 */}
          <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Space direction="vertical" size="large">
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleAddToKB}
                disabled={selectedAvailableIds.length === 0 || operating}
                loading={operating}
                size="large"
                style={{ width: 60, height: 60 }}
                title={`添加 ${selectedAvailableIds.length} 个文档`}
              />
              <Button
                danger
                icon={<ArrowLeftOutlined />}
                onClick={handleRemoveFromKB}
                disabled={selectedAddedIds.length === 0 || operating}
                loading={operating}
                size="large"
                style={{ width: 60, height: 60 }}
                title={`移除 ${selectedAddedIds.length} 个文档`}
              />
            </Space>
          </Col>

          {/* 右侧：已添加的文档 */}
          <Col span={11}>
            <Card
              title={
                <Space>
                  <Text strong>已添加的文档</Text>
                  <Tag color="green">{filteredAdded.length}</Tag>
                </Space>
              }
              size="small"
              extra={
                selectedAddedIds.length > 0 && (
                  <Text type="secondary">已选 {selectedAddedIds.length} 个</Text>
                )
              }
            >
              <Input
                placeholder="搜索文档名称"
                prefix={<SearchOutlined />}
                value={addedSearch}
                onChange={(e) => setAddedSearch(e.target.value)}
                style={{ marginBottom: 12 }}
                allowClear
              />
              <div style={{ height: 500, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                {filteredAdded.length === 0 ? (
                  <Empty
                    description={addedSearch ? '没有匹配的文档' : '还没有添加文档'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginTop: 100 }}
                  />
                ) : (
                  <List
                    dataSource={filteredAdded}
                    renderItem={(doc) => renderDocumentItem(doc, true)}
                    split={false}
                  />
                )}
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">
            提示：点击文档或勾选复选框进行选择，然后点击中间的箭头按钮进行添加或移除操作
          </Text>
        </div>
      </Modal>
    </div>
  );
};