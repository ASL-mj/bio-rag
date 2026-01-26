# Bio-RAG 前端项目

基于 React + TypeScript + Ant Design 的知识库 RAG 系统前端。

## 当前状态

✅ **已完成的功能模块：**

### 1. 用户认证
- ✅ 用户注册
- ✅ 用户登录
- ✅ 自动登录（Token 持久化）
- ✅ 退出登录

### 2. 知识库管理
- ✅ 创建知识库
- ✅ 查看知识库列表
- ✅ 查看知识库详情
- ✅ 删除知识库
- ✅ 配置分块参数（chunk_size, chunk_overlap）

### 3. 文档管理
- ✅ 上传文档（PDF, DOCX, DOC, TXT, MD）
- ✅ 查看文档列表
- ✅ 从知识库移除文档
- ✅ 文档状态显示

### 4. 会话管理
- ✅ 查看会话列表（侧边栏）
- ✅ 删除会话
- ✅ 会话历史加载

### 5. 对话功能
- ⚠️ **模拟对话**（当前使用模拟响应）
- ✅ 选择知识库
- ✅ 消息显示（Markdown 渲染）
- ✅ 会话历史查看

### 6. 统计信息
- ✅ Dashboard 统计展示
- ✅ 会话数、消息数、文档数统计

## 技术栈

- **框架**: React 18 + TypeScript
- **UI 库**: Ant Design 5
- **路由**: React Router 6
- **HTTP 客户端**: Axios
- **Markdown 渲染**: react-markdown
- **构建工具**: Vite
- **包管理器**: Yarn

## 项目结构

```
src/
├── api/                    # API 接口封装
│   ├── client.ts          # Axios 客户端配置
│   ├── auth.ts            # 认证接口
│   ├── chat.ts            # 对话接口
│   ├── sessions.ts        # 会话接口
│   ├── stats.ts           # 统计接口
│   ├── knowledgeBase.ts   # 知识库接口
│   ├── documents.ts       # 文档接口
│   ├── health.ts          # 健康检查接口
│   └── index.ts           # 统一导出
├── components/            # 公共组件
│   ├── Layout.tsx         # 主布局（侧边栏+内容区）
│   └── ProtectedRoute.tsx # 路由守卫
├── contexts/              # React Context
│   └── AuthContext.tsx    # 认证上下文
├── pages/                 # 页面组件
│   ├── Login.tsx          # 登录页
│   ├── Register.tsx       # 注册页
│   ├── Dashboard.tsx      # 仪表盘
│   ├── KnowledgeBases.tsx # 知识库列表
│   ├── KnowledgeBaseDetail.tsx # 知识库详情
│   └── ChatPage.tsx       # 对话页面
├── assets/                # 静态资源
├── App.tsx                # 应用入口
└── main.tsx               # 主入口

```

## 开发指南

### 安装依赖

```bash
yarn install
```

### 启动开发服务器

```bash
yarn dev
```

访问: http://localhost:8027

### 构建生产版本

```bash
yarn build
```

### 预览生产构建

```bash
yarn preview
```

## API 配置

在 `.env` 文件中配置后端 API 地址：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 待完成功能

### 对话功能增强
- [ ] 对接真实的 Chat API
- [ ] 实现流式响应（SSE）
- [ ] 显示 Agent 思考过程
- [ ] 显示工具调用和结果
- [ ] 引用来源展示

### 知识库功能增强
- [ ] 更新知识库配置
- [ ] 文档重新处理
- [ ] 查看文档分块详情
- [ ] 文档搜索和过滤

### 会话功能增强
- [ ] 编辑会话标题
- [ ] 导出会话记录
- [ ] 会话搜索

### 其他功能
- [ ] 用户设置页面
- [ ] LLM 配置管理
- [ ] 错误边界处理
- [ ] 加载状态优化
- [ ] 响应式设计优化

## 注意事项

1. **对话功能**: 当前使用模拟响应，需要后端 Chat API 完全对接后才能使用真实的 RAG 功能
2. **会话标题编辑**: 侧边栏的会话标题编辑功能需要后端提供更新接口
3. **文档处理状态**: 文档上传后的处理状态需要轮询或 WebSocket 来实时更新

## 已移除的功能

以下功能因为没有对应的后端接口支持而被移除：
- ❌ LLM 配置管理页面
- ❌ 用户设置页面
- ❌ Sessions 独立页面（已整合到侧边栏）

## 贡献指南

1. 所有 API 类型定义都在对应的 API 文件中，不使用单独的 types 目录
2. 使用 Ant Design 组件库，保持 UI 风格一致
3. 遵循 React Hooks 最佳实践
4. 使用 TypeScript 严格模式

## License

MIT
# RAG对话网站
