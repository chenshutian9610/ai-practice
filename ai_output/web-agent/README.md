# Web Agent Chat System

基于 Vue + Express 的全栈 Web 应用，支持对接 OpenAI 兼容的大模型 API，提供 Web 聊天界面、会话管理、MCP Server 工具调用等功能。

## 快速启动

```bash
# 安装依赖
npm install

# 启动前后端开发服务器（同时运行 client 和 server）
npm run dev
```

启动后访问 `http://localhost:3005`（前端默认端口）。

## 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动前后端开发服务器 |
| `npm run dev:client` | 仅启动前端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run build` | 构建前后端生产版本 |

## 项目结构

```
web-agent/
├── client/           # Vue 前端
│   ├── src/
│   │   ├── components/   # Vue 组件
│   │   ├── views/        # 页面视图
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── api/          # API 封装
│   │   └── styles/       # 主题样式
├── server/           # Express 后端
│   └── src/
│       ├── routes/        # REST API 路由
│       ├── graphql/       # GraphQL 端点
│       ├── services/      # 业务服务
│       └── mcp/          # MCP 协议客户端
├── data/             # SQLite 数据库
├── docs/             # 项目文档
└── package.json      # 根目录 workspace
```

## 文档说明

| 文件 | 说明 |
|------|------|
| [docs/1.constitution.md](docs/1.constitution.md) | 项目宪章：技术栈、代码规范，开发流程 |
| [docs/2.spec.md](docs/2.spec.md) | 需求规格说明书：功能需求、API 设计、数据模型 |
| [docs/3.plan.md](docs/3.plan.md) | 技术方案：目录结构、核心模块设计、风险评估 |
| [docs/4.tests.md](docs/4.tests.md) | 测试用例：功能测试场景 |
| [docs/5.tasks.md](docs/5.tasks.md) | 任务列表：开发任务追踪 |

## 主要功能

### 聊天界面
![聊天界面](img/chat-light.png)

### 设置页面 - MCP Server 配置
![设置页面](img/settings-mcp.png)

- **聊天功能**：多轮对话、会话管理、流式响应
- **LLM 对接**：支持 OpenAI 兼容 API，自定义 Endpoint 和 API Key
- **Agent 配置**：可设置 System Prompt
- **MCP Server 支持**：支持 HTTP 和 Stdio 两种传输方式，可配置多个 MCP Server
- **工具调用**：自动发现 MCP Server 提供的工具，LLM 可调用工具获取实时数据
- **数据管理**：会话导出/导入为 JSON
- **主题切换**：支持亮色/暗色主题

## MCP Server 支持

Web Agent 支持通过 MCP (Model Context Protocol) 连接外部工具服务，实现更强大的 Agent 能力。

### 支持的传输类型

1. **HTTP传输**：适用于远程 MCP Server
   - 示例：`https://mcp-weathertrax.jaredco.com`

2. **Stdio传输**：适用于本地 MCP Server
   - 需要配置 command 和 args
   - 示例：`python -m mcp_server_time`

### 配置 MCP Server

1. 进入设置页面
2. 在 "MCP Servers" 部分点击 "添加 Server"
3. 选择传输类型（HTTP 或 Stdio）
4. 填写 Server 名称和配置
5. 点击 "测试连接" 验证连接
6. 保存配置

### 测试可用的 MCP Server

#### Weather Server (HTTP)
```json
{
  "name": "Weather",
  "url": "https://mcp-weathertrax.jaredco.com"
}
```

#### Time Server (Stdio)
```json
{
  "name": "Time",
  "command": "/usr/bin/python3",
  "args": ["-m", "mcp_server_time"]
}
```

## 前端路由

| 路径 | 页面 |
|------|------|
| `/` | 聊天主界面 |
| `/settings` | 设置页面 |

## 后端 API

### REST API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/sessions` | 获取所有会话列表 |
| POST | `/api/sessions` | 创建新会话 |
| GET | `/api/sessions/:id` | 获取会话详情（含消息） |
| DELETE | `/api/sessions/:id` | 删除会话 |
| POST | `/api/chat` | 发送消息（非流式） |
| POST | `/api/chat/stream` | 发送消息（流式，SSE） |
| GET | `/api/sessions/:id/export` | 导出会话 |
| POST | `/api/sessions/import` | 导入会话 |
| GET | `/api/settings` | 获取设置 |
| PUT | `/api/settings` | 保存设置 |
| GET | `/api/settings/mcp-servers` | 获取 MCP Server 列表 |
| POST | `/api/settings/mcp-servers` | 添加 MCP Server |
| PUT | `/api/settings/mcp-servers` | 更新 MCP Server 列表 |
| POST | `/api/settings/mcp-servers/test` | 测试 MCP Server 连接 |
| DELETE | `/api/settings/mcp-servers/:id` | 删除 MCP Server |

### GraphQL

| 端点 | 说明 |
|------|------|
| POST `/graphql` | GraphQL API 端点 |
