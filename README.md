# Simple Chatroom | 简易聊天室

A real-time chatroom with file sharing and AI chat integration, built with Vue 3 and Socket.IO. | 基于 Vue 3 和 Socket.IO 构建的实时聊天室，支持文件共享和 AI 对话功能。

## Features | 功能特点 ✨

- 🔐 User authentication | 用户认证系统
- 💬 Real-time messaging | 实时消息通讯
- 📁 File sharing (images, videos, documents) | 文件共享（图片、视频、文档）
- 🤖 AI chat integration (Spark AI) | AI 对话集成（星火大模型）
- 😊 Emoji support | 表情符号支持
- 📝 Markdown support | Markdown 支持
- 🎯 @mentions | @提及功能
- 👥 Online users list | 在线用户列表

## Tech Stack | 技术栈 🛠️

- Frontend | 前端
  - Vue 3
  - Element Plus 
  - Socket.IO Client
  - Pinia
  - Vue Router
  - V-MD-Editor

- Backend | 后端
  - Express
  - Socket.IO
  - MySQL
  - Multer

## Prerequisites | 环境要求 📋

- Node.js >= 18
- MySQL >= 8.0

## Installation | 安装步骤 🚀

1. Clone the repository | 克隆仓库

```
git clone https://github.com/Azure67/SimpleChatroom.git
cd SimpleChatroom
```

2. Install dependencies | 安装依赖
```bash
npm install
```

3. Configure database | 配置数据库

Create a MySQL database and table | 创建 MySQL 数据库和表:
```sql
CREATE DATABASE chatroom;
USE chatroom;

CREATE TABLE `user` (
  `name` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `password` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;
```

4. Configure environment | 配置环境变量

Copy `.env.example` to `.env` and update the values | 复制 `.env.example` 到 `.env` 并更新配置:
```bash
cp .env.example .env
```

Required environment variables | 需要的环境变量:
- `SPARK_API_KEY`: Your Spark AI API key | 你的星火大模型 API 密钥

5. Start the server | 启动服务器
```bash
node public/server.js
```

6. Start the frontend | 启动前端
```bash
npm run dev
```

## Usage | 使用说明 📖

1. Register/Login | 注册/登录
   - Create a new account or login with existing credentials
   - 创建新账户或使用现有账户登录

2. Chat Features | 聊天功能
   - Send text messages | 发送文本消息
   - Share files | 分享文件
   - Use emoji | 使用表情符号
   - Format text with Markdown | 使用 Markdown 格式化文本
   - @mention users | @提及其他用户

3. AI Integration | AI 集成
   - Chat with AI using "@星火大模型" | 使用"@星火大模型"与 AI 对话
   - Get AI-powered responses | 获取 AI 回复

## Contributing | 贡献指南 🤝

Contributions are welcome! | 欢迎贡献！

1. Fork the repository | 复刻仓库
2. Create your feature branch | 创建特性分支
3. Commit your changes | 提交更改
4. Push to the branch | 推送到分支
5. Open a Pull Request | 创建拉取请求

## License | 许可证 📄

[MIT License](LICENSE)

## Contact | 联系方式 📧
AzAzure210@163.com

Project Link | 项目链接: [https://github.com/yourusername/SimpleChatroom](https://github.com/yourusername/SimpleChatroom)
