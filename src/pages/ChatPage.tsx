/**
 * Chat Page - 支持流式对话和历史记录
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Input,
  Button,
  Card,
  Space,
  Typography,
  message,
  Select,
  Spin,
  Empty,
  Collapse,
  Tag,
  Popover,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CopyOutlined,
  CheckOutlined,
  DownloadOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  Html5Outlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { knowledgeBaseApi, sessionsApi, chatApi, KnowledgeBaseInfo, Message } from '@/api';
import { exportToMarkdown, exportToHTML, exportToPDF, exportToWord } from '@/utils/exportUtils';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AgentIteration {
  iteration: number;
  thought: string;
  action: string;
  action_input: string;
  observation: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  iterations?: AgentIteration[];
  isStreaming?: boolean;
  isError?: boolean;
  sources?: any[];
}

export const ChatPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseInfo[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<number[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSessionId = useRef<string>(sessionId || `session_${Date.now()}`);
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState<string>('');

  // 导出会话为JSON（原有功能）
  const handleExportSessionJSON = async () => {
    if (!sessionId) {
      message.warning('当前没有可导出的会话');
      return;
    }

    try {
      const data = await sessionsApi.exportSession(sessionId);
      
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('会话导出成功');
    } catch (error) {
      console.error('导出会话失败:', error);
      message.error('导出会话失败');
    }
  };

  // 导出为不同格式
  const handleExport = async (format: 'markdown' | 'html' | 'pdf' | 'word' | 'json') => {
    if (messages.length === 0) {
      message.warning('当前没有可导出的消息');
      return;
    }

    try {
      const title = sessionTitle || '对话记录';
      const exportMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        iterations: msg.iterations,
        sources: msg.sources,
      }));

      switch (format) {
        case 'markdown':
          exportToMarkdown(exportMessages, title, sessionId);
          message.success('Markdown 导出成功');
          break;
        case 'html':
          exportToHTML(exportMessages, title, sessionId);
          message.success('HTML 导出成功');
          break;
        case 'pdf':
          await exportToPDF(exportMessages, title, sessionId);
          message.success('PDF 导出成功');
          break;
        case 'word':
          await exportToWord(exportMessages, title, sessionId);
          message.success('Word 导出成功');
          break;
        case 'json':
          await handleExportSessionJSON();
          break;
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败：' + (error as Error).message);
    }
  };

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'markdown',
      label: 'Markdown (.md)',
      icon: <FileMarkdownOutlined />,
      onClick: () => handleExport('markdown'),
    },
    {
      key: 'html',
      label: 'HTML (.html)',
      icon: <Html5Outlined />,
      onClick: () => handleExport('html'),
    },
    {
      key: 'pdf',
      label: 'PDF (.pdf)',
      icon: <FilePdfOutlined />,
      onClick: () => handleExport('pdf'),
    },
    {
      key: 'word',
      label: 'Word (.docx)',
      icon: <FileWordOutlined />,
      onClick: () => handleExport('word'),
    },
    {
      type: 'divider',
    },
    {
      key: 'json',
      label: 'JSON (原始数据)',
      icon: <FileTextOutlined />,
      onClick: () => handleExport('json'),
      disabled: !sessionId,
    },
  ];

  useEffect(() => {
    loadKnowledgeBases();
    if (sessionId) {
      loadSessionHistory(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听新对话事件
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
      setSessionTitle('');
      setSelectedKBs([]);
      setInputValue('');
      currentSessionId.current = `session_${Date.now()}`;
    };

    window.addEventListener('new-chat', handleNewChat);
    return () => {
      window.removeEventListener('new-chat', handleNewChat);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadKnowledgeBases = async () => {
    try {
      const data = await knowledgeBaseApi.list();
      setKnowledgeBases(data);
    } catch (error) {
      console.error('加载知识库失败:', error);
    }
  };

  const loadSessionHistory = async (sid: string) => {
    try {
      setLoadingHistory(true);
      const sessions = await sessionsApi.getSessions(0, 100);
      const currentSession = sessions.find((s) => s.session_id === sid);
      if (currentSession) {
        setSessionTitle(currentSession.title);
      }
      
      const history = await sessionsApi.getSessionMessages(sid);
      const chatMessages: ChatMessage[] = history.map((msg: Message) => ({
        id: msg.id.toString(),
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        iterations: msg.iterations || [],
        sources: msg.sources || [],
      }));
      setMessages(chatMessages);
    } catch (error) {
      console.error('加载历史消息失败:', error);
      message.error('加载历史消息失败');
    } finally {
      setLoadingHistory(false);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      message.info('已停止生成');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // 添加临时的 assistant 消息用于实时更新
    const tempAssistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      iterations: [],
      isStreaming: true,
    };
    setMessages((prev) => [...prev, tempAssistantMessage]);

    // 创建 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        message.error('请先登录');
        return;
      }

      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId.current,
          message: inputValue,
          knowledge_base_ids: selectedKBs.length > 0 ? selectedKBs : null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentIteration: AgentIteration | null = null;
      let iterations: AgentIteration[] = [];
      let finalAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  // 开始流式传输
                  break;

                case 'thought_token':
                  if (!currentIteration) {
                    currentIteration = {
                      iteration: iterations.length + 1,
                      thought: '',
                      action: '',
                      action_input: '',
                      observation: '',
                    };
                    iterations.push(currentIteration);
                  }
                  currentIteration.thought += data.content;
                  
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      iterations: [...iterations],
                    };
                    return newMessages;
                  });
                  break;

                case 'action_token':
                  if (currentIteration) {
                    currentIteration.action += data.content;
                    
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        ...newMessages[newMessages.length - 1],
                        iterations: [...iterations],
                      };
                      return newMessages;
                    });
                  }
                  break;

                case 'action_input_token':
                  if (currentIteration) {
                    currentIteration.action_input += data.content;
                    
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        ...newMessages[newMessages.length - 1],
                        iterations: [...iterations],
                      };
                      return newMessages;
                    });
                  }
                  break;

                case 'observation':
                  if (currentIteration) {
                    currentIteration.observation = data.content;
                    currentIteration = null; // 完成当前迭代
                    
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        ...newMessages[newMessages.length - 1],
                        iterations: [...iterations],
                      };
                      return newMessages;
                    });
                  }
                  break;

                case 'token':
                  finalAnswer += data.content;
                  
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: finalAnswer,
                      iterations: [...iterations],
                    };
                    return newMessages;
                  });
                  break;

                case 'done':
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: data.final_answer || finalAnswer,
                      iterations: data.react_iterations || iterations,
                      sources: data.sources || [],
                      isStreaming: false,
                    };
                    return newMessages;
                  });
                  setLoading(false);
                  
                  // 如果是新会话，触发会话创建事件
                  if (!sessionId) {
                    window.dispatchEvent(new CustomEvent('session-created'));
                  }
                  break;

                case 'error':
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: data.content || '发生错误',
                      isStreaming: false,
                      isError: true,
                    };
                    return newMessages;
                  });
                  message.error(data.content || '发生错误');
                  setLoading(false);
                  break;
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            content: lastMsg.content || '生成已停止',
            isStreaming: false,
          };
          return newMessages;
        });
      } else {
        message.error('发送失败：' + error.message);
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: '抱歉，发生了错误：' + error.message,
            isStreaming: false,
            isError: true,
          };
          return newMessages;
        });
      }
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string, type: 'code' | 'message') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(''), 2000);
      } else {
        setCopiedMessage(id);
        setTimeout(() => setCopiedMessage(''), 2000);
      }
      message.success('复制成功');
    } catch (err) {
      message.error('复制失败');
    }
  };

  const renderMarkdown = (content: string, messageId: string) => {
    const components: Components = {
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        const codeId = `${messageId}-${Math.random()}`;
        
        if (!inline && match) {
          return (
            <div style={{ position: 'relative', marginTop: '0.5em', marginBottom: '0.5em' }}>
              <Button
                size="small"
                icon={copiedCode === codeId ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => copyToClipboard(codeString, codeId, 'code')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  zIndex: 1,
                  opacity: 0.8,
                }}
                type={copiedCode === codeId ? 'primary' : 'default'}
              >
                {copiedCode === codeId ? '已复制' : '复制代码'}
              </Button>
              {/* @ts-ignore - SyntaxHighlighter type issue */}
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }
        
        return (
          <code
            className={className}
            style={{
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: 3,
              fontSize: '0.9em',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            }}
            {...props}
          >
            {children}
          </code>
        );
      },
      p({ children }) {
        return <p style={{ margin: '0.5em 0' }}>{children}</p>;
      },
      ul({ children }) {
        return <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ul>;
      },
      ol({ children }) {
        return <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>{children}</ol>;
      },
      li({ children }) {
        return <li style={{ margin: '0.25em 0' }}>{children}</li>;
      },
      blockquote({ children }) {
        return (
          <blockquote
            style={{
              borderLeft: '4px solid #d9d9d9',
              paddingLeft: '1em',
              margin: '0.5em 0',
              color: '#595959',
            }}
          >
            {children}
          </blockquote>
        );
      },
      table({ children }) {
        return (
          <div style={{ overflowX: 'auto', margin: '0.5em 0' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                border: '1px solid #d9d9d9',
              }}
            >
              {children}
            </table>
          </div>
        );
      },
      th({ children }) {
        return (
          <th
            style={{
              border: '1px solid #d9d9d9',
              padding: '8px 12px',
              background: '#fafafa',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {children}
          </th>
        );
      },
      td({ children }) {
        return (
          <td
            style={{
              border: '1px solid #d9d9d9',
              padding: '8px 12px',
            }}
          >
            {children}
          </td>
        );
      },
      a({ href, children }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1890ff', textDecoration: 'none' }}
          >
            {children}
          </a>
        );
      },
      h1({ children }) {
        return <h1 style={{ fontSize: '1.8em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h1>;
      },
      h2({ children }) {
        return <h2 style={{ fontSize: '1.5em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h2>;
      },
      h3({ children }) {
        return <h3 style={{ fontSize: '1.3em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h3>;
      },
      h4({ children }) {
        return <h4 style={{ fontSize: '1.1em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h4>;
      },
      h5({ children }) {
        return <h5 style={{ fontSize: '1em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h5>;
      },
      h6({ children }) {
        return <h6 style={{ fontSize: '0.9em', margin: '0.5em 0', fontWeight: 600 }}>{children}</h6>;
      },
      hr() {
        return <hr style={{ border: 'none', borderTop: '1px solid #d9d9d9', margin: '1em 0' }} />;
      },
    };

    return (
      <div style={{ position: 'relative' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'user') {
      return (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.content}
        </div>
      );
    }

    const hasIterations = msg.iterations && msg.iterations.length > 0;

    return (
      <div>
        {/* 执行过程 - 节点式展示 */}
        {hasIterations && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {msg.isStreaming && <Spin size="small" />}
              <Text type="secondary" strong style={{ fontSize: 13 }}>
                🔍 执行过程
              </Text>
            </div>
            
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {msg.iterations!.map((iter, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* 迭代标题 */}
                  <div style={{ 
                    marginBottom: 8, 
                    paddingLeft: 12,
                    borderLeft: '3px solid #1890ff',
                    fontSize: 12,
                    color: '#8c8c8c',
                    fontWeight: 500,
                  }}>
                    第 {iter.iteration} 轮迭代
                  </div>

                  {/* 思考节点 */}
                  {iter.thought && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 8,
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                      }}
                      bodyStyle={{ padding: '10px 12px' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Space>
                          <BulbOutlined style={{ color: '#faad14', fontSize: 16 }} />
                          <Text strong style={{ fontSize: 13, color: '#d48806' }}>
                            💭 思考
                          </Text>
                        </Space>
                        <div style={{
                          fontSize: 13,
                          color: '#595959',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                        }}>
                          {iter.thought}
                        </div>
                      </Space>
                    </Card>
                  )}

                  {/* 工具调用节点 */}
                  {iter.action && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 8,
                        background: '#e6f7ff',
                        border: '1px solid #91d5ff',
                      }}
                      bodyStyle={{ padding: '10px 12px' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Space>
                          <ThunderboltOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                          <Text strong style={{ fontSize: 13, color: '#096dd9' }}>
                            🔧 调用工具
                          </Text>
                        </Space>
                        <div>
                          <Tag color="blue" style={{ fontSize: 12 }}>
                            {iter.action}
                          </Tag>
                        </div>
                        {iter.action_input && (
                          <div style={{
                            fontSize: 12,
                            color: '#595959',
                            background: '#f0f5ff',
                            padding: '6px 10px',
                            borderRadius: 4,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                            lineHeight: 1.5,
                          }}>
                            {iter.action_input}
                          </div>
                        )}
                      </Space>
                    </Card>
                  )}

                  {/* 观察结果节点 */}
                  {iter.observation && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 8,
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                      }}
                      bodyStyle={{ padding: '10px 12px' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Space>
                          <EyeOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                          <Text strong style={{ fontSize: 13, color: '#389e0d' }}>
                            📊 观察结果
                          </Text>
                        </Space>
                        <div style={{
                          fontSize: 13,
                          color: '#595959',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}>
                          {iter.observation}
                        </div>
                      </Space>
                    </Card>
                  )}
                </div>
              ))}
            </Space>
          </div>
        )}

        {/* 最终答案 */}
        {msg.content && (
          <div style={{ marginTop: hasIterations ? 8 : 0 }}>
            <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary" strong>
                ✅ 最终答案
              </Text>
              <Button
                size="small"
                icon={copiedMessage === msg.id ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => copyToClipboard(msg.content, msg.id, 'message')}
                type={copiedMessage === msg.id ? 'primary' : 'text'}
              >
                {copiedMessage === msg.id ? '已复制' : '复制回复'}
              </Button>
            </Space>
            <div
              style={{
                color: msg.isError ? '#ff4d4f' : 'inherit',
              }}
            >
              {renderMarkdown(msg.content, msg.id)}
            </div>
          </div>
        )}

        {/* 如果正在流式传输且还没有答案 */}
        {msg.isStreaming && !msg.content && (
          <div style={{ marginTop: hasIterations ? 8 : 0 }}>
            <Space>
              <Spin size="small" />
              <Text type="secondary">正在生成答案...</Text>
            </Space>
          </div>
        )}

        {/* 文献引用 - Tag 形式 */}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space size={[8, 8]} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <FileTextOutlined /> 参考文献:
              </Text>
              {msg.sources.map((source: any, idx: number) => (
                <Popover
                  key={idx}
                  title={
                    <Space direction="vertical" size={4}>
                      <Space>
                        <Tag color="blue">{source.kb_name || '知识库'}</Tag>
                        {source.file_name && (
                          <Tag color="green" icon={<FileTextOutlined />}>
                            {source.file_name}
                          </Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        相似度: {(source.score || 0).toFixed(3)}
                      </Text>
                    </Space>
                  }
                  content={
                    <div style={{ maxWidth: 400, maxHeight: 300, overflow: 'auto' }}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#595959',
                          display: 'block',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {source.content}
                      </Text>
                    </div>
                  }
                  placement="top"
                  overlayStyle={{ maxWidth: 450 }}
                >
                  <Tag
                    icon={<FileTextOutlined />}
                    color="blue"
                    style={{ cursor: 'pointer' }}
                  >
                    [{idx + 1}] {source.file_name || source.kb_name || '文档'} ({(source.score || 0).toFixed(2)})
                  </Tag>
                </Popover>
              ))}
            </Space>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* 顶部工具栏 */}
      <Card
        style={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
        }}
        bodyStyle={{ padding: '12px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {sessionId ? (sessionTitle || '加载中...') : '新对话'}
          </Title>
          {messages.length > 0 && (
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button icon={<DownloadOutlined />} type="default">
                导出对话
              </Button>
            </Dropdown>
          )}
        </div>
      </Card>

      {/* 消息区域 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: '#f5f5f5',
        }}
      >
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : messages.length === 0 ? (
          <Empty
            description="开始新的对话"
            image={<RobotOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
            style={{ marginTop: 100 }}
          >
            <Text type="secondary">
              输入您的问题，AI 助手将为您解答
            </Text>
          </Empty>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Card
                  style={{
                    maxWidth: '70%',
                    background: msg.role === 'user' ? '#1890ff' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#000',
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Space>
                      {msg.role === 'user' ? (
                        <UserOutlined style={{ color: '#fff' }} />
                      ) : (
                        <RobotOutlined style={{ color: '#1890ff' }} />
                      )}
                      <Text
                        strong
                        style={{ color: msg.role === 'user' ? '#fff' : '#000' }}
                      >
                        {msg.role === 'user' ? '我' : 'AI 助手'}
                      </Text>
                    </Space>
                    {renderMessage(msg)}
                  </Space>
                </Card>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* 输入区域 */}
      <Card
        style={{
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 知识库选择 */}
          <Select
            mode="multiple"
            placeholder="选择知识库（可选）"
            style={{ width: '100%' }}
            value={selectedKBs}
            onChange={setSelectedKBs}
            options={knowledgeBases.map((kb) => ({
              label: kb.name,
              value: kb.id,
            }))}
            maxTagCount="responsive"
          />
          
          {/* 输入框和发送按钮 */}
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              style={{ flex: 1 }}
            />
            {loading ? (
              <Button
                danger
                type="primary"
                icon={<CloseCircleOutlined />}
                onClick={stopGeneration}
                size="large"
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
                size="large"
              >
                发送
              </Button>
            )}
          </Space.Compact>
        </Space>
      </Card>
    </div>
  );
};
