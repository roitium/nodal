# Cloudflare Worker 环境变量配置指南

## 概述

在 Cloudflare Workers 上运行 Hono 应用需要正确配置环境变量。有三种方式可以提供环境变量：

## 1. 使用 Secrets（推荐用于生产密钥）

Secrets 是加密存储的敏感信息，不会被暴露在版本控制中。

### 使用 Wrangler CLI 添加 Secrets

```bash
cd apps/backend-hono

# 添加密钥（可交互式输入）
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put STORAGE_BUCKET

# 或者通过 stdin
echo "your-value" | wrangler secret put SECRET_NAME

# 查看已配置的 secrets 列表
wrangler secret list
```

### 在代码中访问

Secrets 作为 Worker 的 Bindings 传递，通过 `c.env` 访问：

```typescript
// 在 Hono Handler 中
app.get("/", (c) => {
  const dbUrl = c.env.DATABASE_URL; // 自动从 Secrets 读取
  return c.text("OK");
});
```

## 2. 使用 Environment Variables（公开配置）

环境变量用于非敏感的配置。可以在 `wrangler.toml` 中定义：

```toml
# wrangler.toml
[env.production]
vars = { ROOT_DOMAIN = "nodal.roitium.com", STORAGE_PROVIDER = "supabase" }

[env.staging]
vars = { ROOT_DOMAIN = "staging.nodal.roitium.com" }
```

### 部署时指定环境

```bash
# 部署到生产环境
wrangler deploy --env production

# 部署到暂存环境
wrangler deploy --env staging
```

## 3. 本地开发（.dev.vars）

用于本地开发的环境变量应存储在 `.dev.vars` 文件中：

```bash
cd apps/backend-hono

# 复制示例文件
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars 填入本地开发的值
nano .dev.vars
```

`.dev.vars` **不应被提交到 Git**（已在 `.gitignore` 中忽略）。

### 本地开发优先级

当 `wrangler dev` 运行时，环境变量的读取优先级为：

1. Worker Bindings（从 Wrangler 配置或 Secrets）
2. `.dev.vars` 文件
3. `process.env`（Node.js 进程环境）

## 环境变量清单

| 变量名                    | 类型   | 必需 | 说明                         |
| ------------------------- | ------ | ---- | ---------------------------- |
| DATABASE_URL              | Secret | ✓    | PostgreSQL 连接字符串        |
| JWT_SECRET                | Secret | ✓    | JWT 签名密钥                 |
| SUPABASE_URL              | Secret | ✓    | Supabase 项目 URL            |
| SUPABASE_SERVICE_ROLE_KEY | Secret | ✓    | Supabase Service Role 密钥   |
| STORAGE_BUCKET            | Secret | ✓    | 存储桶名称                   |
| ROOT_DOMAIN               | Var    |      | 根域名（用于多租户）         |
| STORAGE_PROVIDER          | Var    |      | 存储提供商（supabase 或 r2） |
| R2_PUBLIC_BASE_URL        | Var    |      | R2 公共访问基础 URL          |
| S3_ENDPOINT               | Secret |      | R2 S3 兼容 API 端点          |
| S3_ACCESS_KEY_ID          | Secret |      | R2 S3 访问密钥 ID            |
| S3_SECRET_ACCESS_KEY      | Secret |      | R2 S3 机密访问密钥           |
| S3_REGION                 | Var    |      | R2 S3 区域（通常为 auto）    |

## 验证配置

### 本地测试

```bash
cd apps/backend-hono

# 启动本地开发服务器
wrangler dev

# 访问 http://localhost:8787 测试
```

### 生产部署后验证

```bash
# 查看已配置的 secrets
wrangler secret list

# 查看环境变量
wrangler env list

# 查看完整配置
wrangler publish --dry-run
```

## 常见问题

### Q: 部署后出现 "X is not set" 错误

**A:** 确保已使用 `wrangler secret put` 配置了所有必需的 Secrets。

```bash
# 检查已配置的 secrets
wrangler secret list

# 添加缺失的 secret
wrangler secret put MISSING_SECRET_NAME
```

### Q: 本地开发中环境变量不生效

**A:** 确保：

1. 复制了 `.dev.vars.example` 为 `.dev.vars`
2. 填入了正确的值
3. `.dev.vars` 在 `.gitignore` 中（防止泄露）

### Q: 如何更新已有的 Secret

**A:** 使用同样的命令重新设置：

```bash
wrangler secret put DATABASE_URL
# 输入新值...
```

## 参考

- [Wrangler 环境变量文档](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Wrangler Secrets 文档](https://developers.cloudflare.com/workers/configuration/secrets/)
