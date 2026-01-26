/**
 * 导出工具 - 支持多种格式导出对话
 */
import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  iterations?: Array<{
    iteration: number;
    thought: string;
    action: string;
    action_input: string;
    observation: string;
  }>;
  sources?: any[];
}

/**
 * 导出为 Markdown 格式
 */
export const exportToMarkdown = (
  messages: ChatMessage[],
  sessionTitle: string,
  sessionId?: string
) => {
  let markdown = `# ${sessionTitle || '对话记录'}\n\n`;
  
  if (sessionId) {
    markdown += `**会话ID**: ${sessionId}\n\n`;
  }
  
  markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
  markdown += `**消息数量**: ${messages.length}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 用户' : '🤖 AI助手';
    const time = msg.timestamp.toLocaleString('zh-CN');
    
    markdown += `## ${index + 1}. ${role}\n\n`;
    markdown += `**时间**: ${time}\n\n`;
    
    // 如果有执行过程
    if (msg.iterations && msg.iterations.length > 0) {
      markdown += `### 🔍 执行过程\n\n`;
      
      msg.iterations.forEach((iter) => {
        markdown += `#### 第 ${iter.iteration} 轮迭代\n\n`;
        
        if (iter.thought) {
          markdown += `**💭 思考**:\n\n${iter.thought}\n\n`;
        }
        
        if (iter.action) {
          markdown += `**🔧 调用工具**: \`${iter.action}\`\n\n`;
        }
        
        if (iter.action_input) {
          markdown += `**输入参数**:\n\n\`\`\`\n${iter.action_input}\n\`\`\`\n\n`;
        }
        
        if (iter.observation) {
          markdown += `**📊 观察结果**:\n\n${iter.observation}\n\n`;
        }
      });
    }
    
    // 消息内容
    markdown += `### ✅ ${msg.role === 'user' ? '问题' : '回答'}\n\n`;
    markdown += `${msg.content}\n\n`;
    
    // 引用来源
    if (msg.sources && msg.sources.length > 0) {
      markdown += `### 📚 参考文献\n\n`;
      msg.sources.forEach((source, idx) => {
        markdown += `${idx + 1}. **${source.kb_name || '知识库'}** (相似度: ${(source.score || 0).toFixed(2)})\n`;
        markdown += `   > ${source.content.substring(0, 200)}...\n\n`;
      });
    }
    
    markdown += `---\n\n`;
  });

  // 创建下载
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const filename = `${sessionTitle || 'chat'}_${new Date().toISOString().slice(0, 10)}.md`;
  saveAs(blob, filename);
};

/**
 * 导出为 HTML 格式 - 完全模仿对话界面
 */
export const exportToHTML = (
  messages: ChatMessage[],
  sessionTitle: string,
  sessionId?: string
) => {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sessionTitle || '对话记录'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* 顶部标题栏 */
    .header {
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 8px;
    }
    
    .header .meta {
      color: #8c8c8c;
      font-size: 13px;
    }
    
    /* 消息容器 */
    .messages {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    /* 消息行 */
    .message-row {
      display: flex;
      gap: 12px;
    }
    
    .message-row.user {
      justify-content: flex-end;
    }
    
    .message-row.assistant {
      justify-content: flex-start;
    }
    
    /* 消息卡片 */
    .message-card {
      max-width: 70%;
      background: white;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .message-row.user .message-card {
      background: #1890ff;
      color: white;
    }
    
    /* 消息头部 */
    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .message-row.user .message-header {
      color: white;
    }
    
    .message-row.assistant .message-header {
      color: #262626;
    }
    
    .icon {
      font-size: 16px;
    }
    
    /* 执行过程 */
    .iterations {
      margin-bottom: 16px;
    }
    
    .iterations-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #8c8c8c;
    }
    
    .iteration-item {
      margin-bottom: 12px;
    }
    
    .iteration-label {
      margin-bottom: 8px;
      padding-left: 12px;
      border-left: 3px solid #1890ff;
      font-size: 12px;
      color: #8c8c8c;
      font-weight: 500;
    }
    
    /* 思考节点 */
    .thought-card {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    
    .thought-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #d48806;
    }
    
    .thought-content {
      font-size: 13px;
      color: #595959;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
    }
    
    /* 工具调用节点 */
    .action-card {
      background: #e6f7ff;
      border: 1px solid #91d5ff;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    
    .action-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #096dd9;
    }
    
    .action-tag {
      display: inline-block;
      background: #1890ff;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin: 4px 0;
    }
    
    .action-input {
      font-size: 12px;
      color: #595959;
      background: #f0f5ff;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      line-height: 1.5;
      margin-top: 4px;
    }
    
    /* 观察结果节点 */
    .observation-card {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    
    .observation-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #389e0d;
    }
    
    .observation-content {
      font-size: 13px;
      color: #595959;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
      max-height: 200px;
      overflow: auto;
    }
    
    /* 最终答案 */
    .answer-section {
      margin-top: 8px;
    }
    
    .answer-title {
      font-size: 13px;
      font-weight: 600;
      color: #8c8c8c;
      margin-bottom: 8px;
    }
    
    .message-row.user .answer-title {
      color: rgba(255,255,255,0.85);
    }
    
    .answer-content {
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.8;
    }
    
    .message-row.user .answer-content {
      color: white;
    }
    
    /* 引用来源 */
    .sources {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }
    
    .sources-title {
      font-size: 12px;
      color: #8c8c8c;
      margin-bottom: 8px;
    }
    
    .source-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .source-tag {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #1890ff;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .source-tag:hover {
      background: #40a9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(24,144,255,0.3);
    }
    
    .source-tag:hover .source-tooltip,
    .source-tooltip:hover {
      display: block;
    }
    
    .source-tooltip {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      background: white;
      color: #262626;
      padding: 12px;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      width: 400px;
      max-height: 300px;
      overflow: auto;
      z-index: 1000;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      pointer-events: auto;
    }
    
    .source-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: white;
    }
    
    .source-kb-name {
      display: inline-block;
      background: #1890ff;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    /* 代码样式 */
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    .message-row.user code {
      background: rgba(255,255,255,0.2);
      color: white;
    }
    
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 8px 0;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .message-card {
        max-width: 85%;
      }
      
      .source-tooltip {
        width: 280px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 顶部标题栏 -->
    <div class="header">
      <h1>${sessionTitle || '对话记录'}</h1>
      <div class="meta">
        ${sessionId ? `会话ID: ${sessionId} | ` : ''}导出时间: ${new Date().toLocaleString('zh-CN')} | 消息数量: ${messages.length}
      </div>
    </div>
    
    <!-- 消息列表 -->
    <div class="messages">
`;

  messages.forEach((msg) => {
    const roleClass = msg.role === 'user' ? 'user' : 'assistant';
    const roleIcon = msg.role === 'user' ? '👤' : '🤖';
    const roleName = msg.role === 'user' ? '我' : 'AI 助手';
    
    html += `
      <div class="message-row ${roleClass}">
        <div class="message-card">
          <div class="message-header">
            <span class="icon">${roleIcon}</span>
            <span>${roleName}</span>
          </div>
`;

    // 执行过程
    if (msg.iterations && msg.iterations.length > 0) {
      html += `
          <div class="iterations">
            <div class="iterations-title">
              🔍 执行过程
            </div>
`;
      
      msg.iterations.forEach((iter) => {
        html += `
            <div class="iteration-item">
              <div class="iteration-label">第 ${iter.iteration} 轮迭代</div>
`;
        
        // 思考
        if (iter.thought) {
          html += `
              <div class="thought-card">
                <div class="thought-header">💭 思考</div>
                <div class="thought-content">${escapeHtml(iter.thought)}</div>
              </div>
`;
        }
        
        // 工具调用
        if (iter.action) {
          html += `
              <div class="action-card">
                <div class="action-header">🔧 调用工具</div>
                <div class="action-tag">${escapeHtml(iter.action)}</div>
`;
          if (iter.action_input) {
            html += `
                <div class="action-input">${escapeHtml(iter.action_input)}</div>
`;
          }
          html += `
              </div>
`;
        }
        
        // 观察结果
        if (iter.observation) {
          html += `
              <div class="observation-card">
                <div class="observation-header">📊 观察结果</div>
                <div class="observation-content">${escapeHtml(iter.observation)}</div>
              </div>
`;
        }
        
        html += `
            </div>
`;
      });
      
      html += `
          </div>
`;
    }

    // 最终答案
    if (msg.content) {
      html += `
          <div class="answer-section">
            <div class="answer-title">✅ ${msg.role === 'user' ? '问题' : '最终答案'}</div>
            <div class="answer-content">${formatContent(msg.content)}</div>
          </div>
`;
    }

    // 引用来源 - Tag形式，鼠标悬停显示详情
    if (msg.sources && msg.sources.length > 0) {
      html += `
          <div class="sources">
            <div class="sources-title">📄 参考文献:</div>
            <div class="source-tags">
`;
      
      msg.sources.forEach((source, idx) => {
        html += `
              <div class="source-tag">
                [${idx + 1}] ${escapeHtml(source.kb_name || '知识库')} (${(source.score || 0).toFixed(2)})
                <div class="source-tooltip">
                  <span class="source-kb-name">${escapeHtml(source.kb_name || '知识库')}</span>
                  <div>${escapeHtml(source.content)}</div>
                </div>
              </div>
`;
      });
      
      html += `
            </div>
          </div>
`;
    }

    html += `
        </div>
      </div>
`;
  });

  html += `
    </div>
  </div>
</body>
</html>`;

  // 创建下载
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `${sessionTitle || 'chat'}_${new Date().toISOString().slice(0, 10)}.html`;
  saveAs(blob, filename);
};

/**
 * 导出为 PDF 格式
 */
export const exportToPDF = async (
  messages: ChatMessage[],
  sessionTitle: string,
  sessionId?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // 添加中文字体支持（使用默认字体）
  pdf.setFont('helvetica');

  // 标题
  pdf.setFontSize(20);
  pdf.text(sessionTitle || '对话记录', margin, yPosition);
  yPosition += 10;

  // 元信息
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  if (sessionId) {
    pdf.text(`会话ID: ${sessionId}`, margin, yPosition);
    yPosition += 6;
  }
  pdf.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`消息数量: ${messages.length}`, margin, yPosition);
  yPosition += 10;

  // 分隔线
  pdf.setDrawColor(200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // 遍历消息
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    // 检查是否需要新页面
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    // 消息角色和时间
    pdf.setFontSize(12);
    pdf.setTextColor(0);
    const roleText = msg.role === 'user' ? `${i + 1}. 用户` : `${i + 1}. AI助手`;
    pdf.text(roleText, margin, yPosition);
    
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(msg.timestamp.toLocaleString('zh-CN'), pageWidth - margin - 40, yPosition);
    yPosition += 8;

    // 消息内容
    pdf.setFontSize(10);
    pdf.setTextColor(0);
    const lines = pdf.splitTextToSize(msg.content, maxWidth);
    
    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 5;

    // 分隔线
    if (i < messages.length - 1) {
      pdf.setDrawColor(230);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    }
  }

  // 保存PDF
  const filename = `${sessionTitle || 'chat'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
};

/**
 * 导出为 Word 格式
 */
export const exportToWord = async (
  messages: ChatMessage[],
  sessionTitle: string,
  sessionId?: string
) => {
  const children: any[] = [];

  // 标题
  children.push(
    new Paragraph({
      text: sessionTitle || '对话记录',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // 元信息
  if (sessionId) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '会话ID: ', bold: true }),
          new TextRun(sessionId),
        ],
        spacing: { after: 100 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '导出时间: ', bold: true }),
        new TextRun(new Date().toLocaleString('zh-CN')),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '消息数量: ', bold: true }),
        new TextRun(messages.length.toString()),
      ],
      spacing: { after: 400 },
    })
  );

  // 遍历消息
  messages.forEach((msg, index) => {
    const roleText = msg.role === 'user' ? `${index + 1}. 👤 用户` : `${index + 1}. 🤖 AI助手`;
    
    // 消息标题
    children.push(
      new Paragraph({
        text: roleText,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    // 时间
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: msg.timestamp.toLocaleString('zh-CN'),
            italics: true,
            size: 18,
            color: '666666',
          }),
        ],
        spacing: { after: 100 },
      })
    );

    // 执行过程
    if (msg.iterations && msg.iterations.length > 0) {
      children.push(
        new Paragraph({
          text: '🔍 执行过程',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 100, after: 100 },
        })
      );

      msg.iterations.forEach((iter) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `第 ${iter.iteration} 轮迭代`, bold: true }),
            ],
            spacing: { before: 100, after: 50 },
          })
        );

        if (iter.thought) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: '💭 思考: ', bold: true }),
                new TextRun(iter.thought),
              ],
              spacing: { after: 50 },
            })
          );
        }

        if (iter.action) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: '🔧 调用工具: ', bold: true }),
                new TextRun(iter.action),
              ],
              spacing: { after: 50 },
            })
          );
        }

        if (iter.observation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: '📊 观察结果: ', bold: true }),
                new TextRun(iter.observation),
              ],
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // 消息内容
    children.push(
      new Paragraph({
        text: msg.role === 'user' ? '✅ 问题' : '✅ 回答',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 100 },
      })
    );

    // 分段处理内容
    const contentLines = msg.content.split('\n');
    contentLines.forEach((line) => {
      children.push(
        new Paragraph({
          text: line || ' ',
          spacing: { after: 100 },
        })
      );
    });

    // 引用来源
    if (msg.sources && msg.sources.length > 0) {
      children.push(
        new Paragraph({
          text: '📚 参考文献',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      msg.sources.forEach((source, idx) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${idx + 1}] `, bold: true }),
              new TextRun({ text: `${source.kb_name || '知识库'} `, bold: true }),
              new TextRun({ text: `(相似度: ${(source.score || 0).toFixed(2)})`, italics: true }),
            ],
            spacing: { after: 50 },
          })
        );

        children.push(
          new Paragraph({
            text: source.content.substring(0, 200) + '...',
            spacing: { after: 100 },
          })
        );
      });
    }

    // 分隔线（空段落）
    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 300 },
      })
    );
  });

  // 创建文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  // 生成并下载
  const blob = await Packer.toBlob(doc);
  const filename = `${sessionTitle || 'chat'}_${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(blob, filename);
};

/**
 * 辅助函数：转义HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 辅助函数：格式化内容（简单的Markdown到HTML）
 */
function formatContent(content: string): string {
  let formatted = escapeHtml(content);
  
  // 代码块
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // 行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 粗体
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 斜体
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // 换行
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}