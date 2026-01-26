/**
 * Main Layout Component with Ant Design
 * 左右结构：左侧边栏 + 右侧内容区
 */
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Button,
  List,
  Divider,
  message,
  Input,
  Popconfirm,
} from 'antd';
import {
  DatabaseOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { sessionsApi, SessionInfo } from '@/api';
import dayjs from 'dayjs';
import logoImage from '@/assets/LOGO.png';

const { Sider, Content } = AntLayout;
const { Text } = Typography;

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  // 判断当前页面类型
  const isKnowledgeBasePage = location.pathname.startsWith('/knowledge-bases');
  const isDocumentsPage = location.pathname === '/documents';
  // 只有在根路径（新对话页面）或对话页面时才高亮"对话"按钮
  const isChatPage = location.pathname === '/' || location.pathname.startsWith('/chat/');

  useEffect(() => {
    loadRecentSessions();
  }, []);

  // 当路由变化到对话页面时，刷新对话列表
  useEffect(() => {
    if (isChatPage) {
      loadRecentSessions();
    }
  }, [location.pathname]);

  // 监听会话标题更新事件
  useEffect(() => {
    const handleTitleUpdate = (event: CustomEvent) => {
      const { sessionId, title } = event.detail;
      setRecentSessions((prev) =>
        prev.map((s) => (s.session_id === sessionId ? { ...s, title } : s))
      );
    };

    window.addEventListener('session-title-updated', handleTitleUpdate as EventListener);
    return () => {
      window.removeEventListener('session-title-updated', handleTitleUpdate as EventListener);
    };
  }, []);

  // 监听新会话创建事件，刷新会话列表
  useEffect(() => {
    const handleSessionCreated = () => {
      loadRecentSessions();
    };

    window.addEventListener('session-created', handleSessionCreated as EventListener);
    return () => {
      window.removeEventListener('session-created', handleSessionCreated as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecentSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessions = await sessionsApi.getSessions(0, 10);
      setRecentSessions(sessions);
    } catch (err) {
      console.error('加载最近对话失败:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const handleNewChat = () => {
    // 导航到根路径，并强制刷新
    navigate('/', { replace: true });
    // 触发清空消息事件
    window.dispatchEvent(new CustomEvent('new-chat'));
  };

  const handleSessionClick = (sessionId: string, e?: React.MouseEvent) => {
    // 如果点击的是编辑或删除按钮，不触发导航
    if (e && (e.target as HTMLElement).closest('.session-actions')) {
      return;
    }
    navigate(`/chat/${sessionId}`);
  };

  const truncateTitle = (title: string | undefined, maxLength: number = 20) => {
    if (!title) return '未命名对话';
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  const handleEditTitle = async (sessionId: string, currentTitle?: string) => {
    try {
      const newTitle = editingTitle.trim();
      if (!newTitle) {
        message.warning('标题不能为空');
        return;
      }
      
      // 调用 API 更新会话标题
      await sessionsApi.updateSession(sessionId, { title: newTitle });
      
      // 更新本地状态
      setRecentSessions((prev) =>
        prev.map((s) => (s.session_id === sessionId ? { ...s, title: newTitle } : s))
      );
      
      setEditingSessionId(null);
      setEditingTitle('');
      message.success('标题已更新');
      
      // 触发标题更新事件，通知其他组件
      window.dispatchEvent(
        new CustomEvent('session-title-updated', {
          detail: { sessionId, title: newTitle },
        })
      );
    } catch (err: any) {
      message.error('更新标题失败：' + (err.response?.data?.detail || err.message));
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await sessionsApi.deleteSession(sessionId);
      setRecentSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      message.success('会话已删除');
      // 如果删除的是当前会话，导航到首页
      if (location.pathname === `/chat/${sessionId}`) {
        navigate('/');
      }
    } catch (err: any) {
      message.error('删除会话失败');
      console.error(err);
    }
  };

  const handleStartEdit = (sessionId: string, currentTitle?: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle || '');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 左侧边栏 */}
      <Sider
        width={260}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Logo区域 */}
          <div
            style={{
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #f0f0f0',
              padding: '0 20px',
              gap: 12,
              flexShrink: 0,
            }}
          >
          <img
            src={logoImage}
            alt="Bio-RAG Logo"
            style={{
              width: 60,
              height: 60,
              objectFit: 'contain',
            }}
          />
          <Text
            strong
            style={{
              fontSize: 24,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #eb2f96 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 2px 4px rgba(24, 144, 255, 0.3)',
              letterSpacing: '1px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            Bio-RAG
          </Text>
        </div>

        {/* 导航按钮区域 */}
        <div style={{ padding: '16px', flexShrink: 0 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Button
              type={isChatPage ? 'default' : 'text'}
              icon={<MessageOutlined />}
              block
              style={{
                textAlign: 'left',
                height: 40,
                backgroundColor: isChatPage ? '#e6f7ff' : 'transparent',
                border: isChatPage ? '1px solid #91d5ff' : '1px solid #d9d9d9',
              }}
              onClick={handleNewChat}
            >
              新对话
            </Button>
            <Button
              type={isKnowledgeBasePage ? 'default' : 'text'}
              icon={<DatabaseOutlined />}
              block
              style={{
                textAlign: 'left',
                height: 40,
                backgroundColor: isKnowledgeBasePage ? '#e6f7ff' : 'transparent',
                border: isKnowledgeBasePage ? '1px solid #91d5ff' : '1px solid #d9d9d9',
              }}
              onClick={() => navigate('/knowledge-bases')}
            >
              知识库
            </Button>
            <Button
              type={isDocumentsPage ? 'default' : 'text'}
              icon={<FileTextOutlined />}
              block
              style={{
                textAlign: 'left',
                height: 40,
                backgroundColor: isDocumentsPage ? '#e6f7ff' : 'transparent',
                border: isDocumentsPage ? '1px solid #91d5ff' : '1px solid #d9d9d9',
              }}
              onClick={() => navigate('/documents')}
            >
              文档管理
            </Button>
          </Space>
        </div>

        <Divider style={{ margin: '8px 0', flexShrink: 0 }} />

        {/* 最近对话列表 */}
        <div style={{ 
          padding: '0 16px', 
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          maxHeight: '100%',
        }}>
          <Text type="secondary" style={{ fontSize: 12, paddingLeft: 8 }}>
            最近对话
          </Text>
          <List
            style={{ marginTop: 8 }}
            dataSource={recentSessions}
            loading={loadingSessions}
            size="small"
            renderItem={(session) => (
              <List.Item
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: 6,
                  marginBottom: 4,
                  backgroundColor:
                    location.pathname === `/chat/${session.session_id}` ? '#e6f7ff' : 'transparent',
                }}
                onClick={(e) => handleSessionClick(session.session_id, e)}
                onMouseEnter={(e) => {
                  const item = e.currentTarget;
                  if (editingSessionId !== session.session_id) {
                    item.style.backgroundColor = location.pathname === `/chat/${session.session_id}` 
                      ? '#d4edff' 
                      : '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  const item = e.currentTarget;
                  if (editingSessionId !== session.session_id) {
                    item.style.backgroundColor = location.pathname === `/chat/${session.session_id}` 
                      ? '#e6f7ff' 
                      : 'transparent';
                  }
                }}
              >
                {editingSessionId === session.session_id ? (
                  <div style={{ width: '100%' }}>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onPressEnter={() => handleEditTitle(session.session_id, session.title)}
                      onBlur={() => handleCancelEdit()}
                      autoFocus
                      size="small"
                      style={{ marginBottom: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(session.session_id, session.title);
                        }}
                        style={{ padding: 0, fontSize: 11 }}
                      >
                        保存
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        style={{ padding: 0, fontSize: 11 }}
                      >
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        ellipsis
                        style={{
                          fontSize: 13,
                          display: 'block',
                          color:
                            location.pathname === `/chat/${session.session_id}` ? '#1890ff' : '#333',
                        }}
                      >
                        {truncateTitle(session.title)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(session.created_at).format('MM-DD HH:mm')}
                      </Text>
                    </div>
                    <Space 
                      size={4} 
                      className="session-actions"
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginLeft: 8, opacity: 0.6 }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => handleStartEdit(session.session_id, session.title, e)}
                        style={{ 
                          padding: '0 4px',
                          height: 20,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="编辑标题"
                      />
                      <Popconfirm
                        title="确定要删除这个会话吗？"
                        description="删除后无法恢复，所有消息将被删除。"
                        onConfirm={(e) => handleDeleteSession(session.session_id, e!)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          style={{ 
                            padding: '0 4px',
                            height: 20,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="删除会话"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </List.Item>
            )}
            locale={{ emptyText: '暂无对话' }}
          />
        </div>

        {/* 底部账号信息 */}
        <div
          style={{
            borderTop: '1px solid #f0f0f0',
            padding: '12px 16px',
            background: '#fff',
            flexShrink: 0,
            marginTop: 'auto',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="topLeft">
            <Space
              style={{
                cursor: 'pointer',
                width: '100%',
                padding: '4px 8px',
                borderRadius: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Avatar icon={<UserOutlined />} size="small" />
              <Text ellipsis style={{ flex: 1, fontSize: 13 }}>
                {user?.username || '用户'}
              </Text>
            </Space>
          </Dropdown>
        </div>
        </div>
      </Sider>

      {/* 右侧内容区 */}
      <AntLayout style={{ marginLeft: 260, background: '#f5f5f5' }}>
        <Content
          style={{
            minHeight: '100vh',
            padding: 0,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
