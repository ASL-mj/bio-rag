/**
 * Knowledge Bases Page with Ant Design
 * 展示知识库卡片，包含知识库信息和文档数
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Row,
  Modal,
  Form,
  Input,
  message,
  Empty,
  Space,
  Typography,
  Tag,
  Spin,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { knowledgeBaseApi, KnowledgeBaseDetail, KnowledgeBaseCreate, KnowledgeBaseUpdate } from '@/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const KnowledgeBases: React.FC = () => {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingKB, setEditingKB] = useState<KnowledgeBaseDetail | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const data = await knowledgeBaseApi.list();
      
      // 加载每个知识库的详细信息（包含文档数）
      const basesWithDetails = await Promise.all(
        data.map(async (kb) => {
          try {
            const detail = await knowledgeBaseApi.get(kb.id);
            return detail;
          } catch (err) {
            console.error(`加载知识库 ${kb.id} 详情失败:`, err);
            return {
              ...kb,
              document_count: 0,
            };
          }
        })
      );
      
      setKnowledgeBases(basesWithDetails);
    } catch (err: any) {
      message.error('加载知识库失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: KnowledgeBaseCreate) => {
    try {
      await knowledgeBaseApi.create(values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadKnowledgeBases();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '创建失败');
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个知识库吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await knowledgeBaseApi.delete(id);
          message.success('删除成功');
          loadKnowledgeBases();
        } catch (err: any) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleViewDocuments = (id: number) => {
    navigate(`/knowledge-bases/${id}`);
  };

  const handleEdit = (kb: KnowledgeBaseDetail) => {
    setEditingKB(kb);
    editForm.setFieldsValue({
      name: kb.name,
      description: kb.description,
      chunk_size: kb.chunk_size,
      chunk_overlap: kb.chunk_overlap,
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async (values: KnowledgeBaseUpdate) => {
    if (!editingKB) return;
    
    try {
      await knowledgeBaseApi.update(editingKB.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      setEditingKB(null);
      editForm.resetFields();
      loadKnowledgeBases();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '更新失败');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>知识库</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
            size="large"
          >
            创建知识库
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100 }}>
            <Spin size="large" />
          </div>
        ) : knowledgeBases.length === 0 ? (
          <Card>
            <Empty
              image={<DatabaseOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
              description={
                <Space direction="vertical">
                  <Text type="secondary" style={{ fontSize: 16 }}>还没有知识库</Text>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalVisible(true)}
                  >
                    创建第一个知识库
                  </Button>
                </Space>
              }
            />
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {knowledgeBases.map((kb) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={kb.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  bodyStyle={{ padding: '20px' }}
                  actions={[
                    <Button
                      key="documents"
                      type="text"
                      icon={<FileTextOutlined />}
                      onClick={() => handleViewDocuments(kb.id)}
                      style={{ width: '100%', border: 'none' }}
                    >
                      文档管理
                    </Button>,
                    <Button
                      key="edit"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(kb)}
                      style={{ width: '100%', border: 'none' }}
                    >
                      编辑
                    </Button>,
                    <Button
                      key="delete"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(kb.id)}
                      style={{ width: '100%', border: 'none' }}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <DatabaseOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Title level={4} style={{ margin: 0, fontSize: 16 }} ellipsis>
                          {kb.name}
                        </Title>
                      </div>
                    </div>
                    
                    <Paragraph
                      ellipsis={{ rows: 2, expandable: false }}
                      style={{
                        margin: 0,
                        color: '#666',
                        fontSize: 13,
                        minHeight: 40,
                      }}
                    >
                      {kb.description || '暂无描述'}
                    </Paragraph>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Tag color="blue" icon={<FileTextOutlined />}>
                        {kb.document_count || 0} 个文档
                      </Tag>
                      <Tag color="purple">
                        块大小: {kb.chunk_size}
                      </Tag>
                      <Tag color="green">
                        重叠: {kb.chunk_overlap}
                      </Tag>
                    </div>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                      创建于 {dayjs(kb.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      <Modal
        title="创建知识库"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            chunk_size: 512,
            chunk_overlap: 50,
          }}
        >
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              { required: true, message: '请输入知识库名称' },
              { min: 1, max: 100, message: '名称长度应在1-100个字符之间' }
            ]}
          >
            <Input placeholder="请输入知识库名称" size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入知识库描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="chunk_size"
            label="分块大小（字符数）"
            tooltip="文档分块的大小，范围100-2000"
            rules={[{ required: true, message: '请输入分块大小' }]}
          >
            <InputNumber
              min={100}
              max={2000}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="chunk_overlap"
            label="分块重叠（字符数）"
            tooltip="相邻分块之间的重叠字符数，范围0-500"
            rules={[{ required: true, message: '请输入分块重叠' }]}
          >
            <InputNumber
              min={0}
              max={500}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                创建
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑知识库模态框 */}
      <Modal
        title="编辑知识库"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingKB(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              { required: true, message: '请输入知识库名称' },
              { min: 1, max: 100, message: '名称长度应在1-100个字符之间' }
            ]}
          >
            <Input placeholder="请输入知识库名称" size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入知识库描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="chunk_size"
            label="分块大小（字符数）"
            tooltip="文档分块的大小，范围100-2000。注意：修改此参数需要重新处理文档"
            rules={[{ required: true, message: '请输入分块大小' }]}
          >
            <InputNumber
              min={100}
              max={2000}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="chunk_overlap"
            label="分块重叠（字符数）"
            tooltip="相邻分块之间的重叠字符数，范围0-500。注意：修改此参数需要重新处理文档"
            rules={[{ required: true, message: '请输入分块重叠' }]}
          >
            <InputNumber
              min={0}
              max={500}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                保存
              </Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  setEditingKB(null);
                  editForm.resetFields();
                }}
                size="large"
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
