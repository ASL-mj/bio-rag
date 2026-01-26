/**
 * Dashboard Page with Ant Design
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Button, Space, Spin } from 'antd';
import {
  DatabaseOutlined,
  MessageOutlined,
  FileTextOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { statsApi, StatsInfo } from '@/api';

const { Title, Paragraph } = Typography;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>欢迎回来，{user?.username}！</Title>
      <Paragraph type="secondary">
        Bio-RAG 知识库 + AI Agent 平台
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="会话"
              value={stats?.total_sessions || 0}
              prefix={<MessageOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="消息"
              value={stats?.total_messages || 0}
              prefix={<RocketOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="文档"
              value={stats?.total_files || 0}
              prefix={<FileTextOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card
            title="知识库管理"
            extra={<DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
          >
            <Paragraph>
              创建和管理您的知识库，上传文档、配置分块策略、管理向量嵌入。
            </Paragraph>
            <Space>
              <Button type="primary" onClick={() => navigate('/knowledge-bases')}>
                管理知识库
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="AI 会话"
            extra={<MessageOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
          >
            <Paragraph>
              创建会话，配置 Agent 参数，基于知识库进行智能问答。
            </Paragraph>
            <Space>
              <Button type="primary" onClick={() => navigate('/sessions')}>
                管理会话
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="快速开始" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>1. 创建知识库并上传文档</Title>
            <Paragraph type="secondary">
              在知识库页面创建新的知识库，然后上传 PDF、DOCX、TXT 等格式的文档。
            </Paragraph>
          </div>
          <div>
            <Title level={5}>2. 配置分块和向量化策略</Title>
            <Paragraph type="secondary">
              系统会自动处理文档，进行文本分块和向量化。您也可以自定义分块策略。
            </Paragraph>
          </div>
          <div>
            <Title level={5}>3. 创建会话并选择知识库</Title>
            <Paragraph type="secondary">
              在会话页面创建新会话，选择要使用的知识库，配置 Agent 参数。
            </Paragraph>
          </div>
          <div>
            <Title level={5}>4. 开始与 AI Agent 对话</Title>
            <Paragraph type="secondary">
              进入会话后，您可以向 AI 提问，系统会基于知识库内容生成回答。
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
};
