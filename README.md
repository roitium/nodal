（以下内容是 AI 写的，AI 味爆表）

# Nodal Monorepo

Nodal 是一个功能齐全、跨平台的“备忘录”或笔记应用程序，其功能类似于一个微博客服务。它采用 monorepo 结构，包含独立的后端、Web 前端和 Android 应用程序。

## ✨ 功能特性

- **跨平台**：支持 Web 和 Android 设备。
- **富文本编辑**：支持 Markdown 格式，方便记录和分享。
- **资源管理**：支持上传和管理图片、文件等多媒体资源。
- **用户认证**：通过 JWT 实现安全的用户注册和登录。
- **数据迁移**：提供了从 Memos 迁移数据的脚本。

## 🚀 技术栈

- **通用**:
  - [Bun](https://bun.sh/) - 作为包管理器和运行时
  - [TypeScript](https://www.typescriptlang.org/) - 用于类型安全
- **后端**:
  - [ElysiaJS](https://elysiajs.com/) - 高性能的 Bun web 框架
  - [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
  - [PostgreSQL](https://www.postgresql.org/) - 数据库
  - [Supabase](https://supabase.com/) - 用于文件存储
- **Web 前端**:
  - [React](https://reactjs.org/) - UI 库
  - [Vite](https://vitejs.dev/) - 构建工具
- **Android**:
  - [Kotlin](https://kotlinlang.org/) - 编程语言
  - [Jetpack Compose](https://developer.android.com/jetpack/compose) - 用于构建原生 UI
  - [Retrofit](https://square.github.io/retrofit/) - 网络请求库

## 📂 目录结构

```
/
├── apps/
│   ├── android/     # Android 应用程序
│   ├── backend/     # ElysiaJS 后端服务
│   ├── recover/     # 数据迁移脚本
│   └── web/         # React Web 前端
└── packages/
    └── ...          # (可选) 共享代码库
```

## ⚡️ 快速开始

### 1. 环境准备

- [Bun](https://bun.sh/docs/installation)
- [Git](https://git-scm.com/)
- [Android Studio](https://developer.android.com/studio) (用于 Android 开发)

### 2. 克隆与安装

首先，克隆项目仓库到本地：

```bash
git clone <your-repository-url>
cd nodal
```

然后，在项目根目录运行以下命令安装所有依赖：

```bash
bun install
```

### 3. 配置后端服务

后端服务需要一些环境变量才能正常运行。

1.  进入 `apps/backend` 目录，创建一个名为 `.env` 的文件。
2.  在 `.env` 文件中添加以下内容，并替换为你的实际配置：

    ```env
    # PostgreSQL 数据库连接字符串
    DATABASE_URL="postgresql://user:password@host:port/database"

    # 用于生成和验证 JWT 的密钥
    JWT_SECRET="your_strong_jwt_secret"

    # Supabase 文件存储配置
    SUPABASE_URL="https://your_project_id.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
    STORAGE_BUCKET="your_storage_bucket_name" # 例如 'memos'

    # 域名配置
    ROOT_DOMAIN="nodal.example.com"
    ```

### 4. 运行应用

你可以分别运行项目的各个部分。所有命令都应在各自的工作区目录（例如 `apps/backend`）中执行。

- **运行后端服务**:

  ```bash
  cd apps/backend
  bun run dev
  ```

  服务将默认启动在 `http://localhost:3000`。

- **运行 Web 应用**:

  ```bash
  cd apps/web
  bun run dev
  ```

  应用将默认启动在 `http://localhost:5000`。

- **运行 Android 应用**:
  1.  使用 Android Studio 打开 `apps/android` 目录。
  2.  等待 Gradle 同步完成。
  3.  选择一个模拟器或连接一个物理设备。
  4.  点击 "Run" 按钮来构建和运行应用。
