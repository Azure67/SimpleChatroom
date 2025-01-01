# Simple Chatroom | 简易聊天室

A real-time chatroom with file sharing and AI chat integration, built with Vue 3 and Socket.IO. | 基于 Vue 3 和 Socket.IO 构建的实时聊天室，支持文件共享和 AI 对话功能。

## Features | 功能特点

- 🔐 User authentication | 用户认证
- 💬 Real-time messaging | 实时消息通讯
- 📁 File sharing support (images, videos, documents) | 文件共享（图片、视频、文档）
- 🤖 AI chat integration (Spark AI) | AI 对话集成（星火大模型）
- 😊 Emoji support | 表情符号支持
- 📝 Markdown support | Markdown 支持
- 🎯 @mentions | @提及功能
- 👥 Online users list | 在线用户列表

## Tech Stack | 技术栈

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

## Prerequisites | 环境要求

- Node.js >= 18
- MySQL >= 8.0

## Installation | 安装

1. Clone the repository | 克隆仓库

```bash
git clone https://github.com/Azure67/SimpleChatroom.git
cd SimpleChatroom
```

2. Install dependencies | 安装依赖

```bash
npm install
```

3. Configure database | 配置数据库

Create a MySQL database and table using the following SQL:

```sql
-- Create database
CREATE DATABASE chatroom;
USE chatroom;

-- Create user table
CREATE TABLE `user` (
  `name` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `password` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;
```

4. Update database configuration in `public/server.js`:
```javascript
const getconn = () => {
    return mysql.createConnection({
        host: 'localhost',
        user: 'your_username',
        password: 'your_password',
        database: 'chatroom'
    });
}
```

5. Start the server | 启动服务器
```bash
node public/server.js
```

6. Start the frontend | 启动前端
```bash
npm run dev
```

## Configuration | 配置

Update the IP address (const IP="192.168.149.56") in the following files:
- `src/components/ChatRoom.vue`
- `src/components/Login.vue`
- `src/components/Message.vue`
- `public/server.js`

## Usage | 使用说明

1. Register/Login | 注册/登录
2. Start chatting | 开始聊天
3. Share files by clicking the upload button | 点击上传按钮分享文件
4. Use @mention to notify users | 使用@提及其他用户
5. Chat with AI using "@星火大模型" | 使用"@星火大模型"与 AI 对话

## License | 许可证

[MIT License](LICENSE)
