# Backend Hono 部署指南

## 部署到 Cloudflare Worker

### 1. 安装 Wrangler 并登录

```bash
npm install -g wrangler
wrangler login
```

### 2. 配置环境变量

在 Cloudflare Dashboard 或终端设置以下 Secrets：

```bash
# 必需
wrangler secret put DATABASE_URL
# 值: postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

wrangler secret put JWT_SECRET
# 值: 随机生成的强密码，至少 32 位

# 可选（如果继续使用 Supabase 存储）
wrangler secret put SUPABASE_URL
# 值: https://[PROJECT_ID].supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 值: Supabase Dashboard > Project Settings > API > service_role key

wrangler secret put STORAGE_BUCKET
# 值: resources（或其他 bucket 名称）

wrangler secret put STORAGE_PROVIDER
# 值: supabase（或 r2）

# 可选（根域名配置）
wrangler secret put ROOT_DOMAIN
# 值: nodal.roitium.com

# 可选（如果使用 R2 存储）
wrangler secret put R2_PUBLIC_BASE_URL
wrangler secret put S3_ENDPOINT
wrangler secret put S3_ACCESS_KEY_ID
wrangler secret put S3_SECRET_ACCESS_KEY
wrangler secret put S3_REGION
```

### 3. 配置 wrangler.toml

已配置的绑定：
- `R2_BUCKET` - 用于文件存储（R2 模式）
- 自定义域名: `nodal.roitium.com`

如需修改绑定，编辑 `wrangler.toml`：

```toml
name = "backend-hono"
main = "src/index.ts"
compatibility_date = "2026-03-14"
compatibility_flags = ["nodejs_compat"]

# 自定义域名
routes = [{ pattern = "nodal.roitium.com", custom_domain = true }]

# R2 存储桶绑定（如果使用 R2）
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "nodal-resources"
```

### 4. 部署

```bash
# 开发
bun run dev

# 部署到生产
bun run deploy
```

### 5. 数据库 Schema 同步

部署后同步数据库 schema：

```bash
# 推送 schema 变更到数据库
bun run db:push
```

## 环境变量清单

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 |
| `SUPABASE_URL` | ⚪ | Supabase 项目 URL（使用 Supabase 存储时必需） |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚪ | Supabase service_role 密钥 |
| `STORAGE_BUCKET` | ⚪ | 存储 bucket 名称（默认: resources） |
| `STORAGE_PROVIDER` | ⚪ | 存储提供商: `supabase` 或 `r2`（默认: supabase） |
| `ROOT_DOMAIN` | ⚪ | 根域名配置 |
| `R2_PUBLIC_BASE_URL` | ⚪ | R2 公共访问 URL（使用 R2 时必需） |
| `S3_ENDPOINT` | ⚪ | R2 S3 端点 |
| `S3_ACCESS_KEY_ID` | ⚪ | R2 Access Key |
| `S3_SECRET_ACCESS_KEY` | ⚪ | R2 Secret Key |
| `S3_REGION` | ⚪ | R2 Region（通常: auto） |

## 生产检查清单

- [ ] Wrangler 已登录
- [ ] 所有必需 Secrets 已设置
- [ ] 数据库 URL 使用 pgBouncer 端口 (6543)
- [ ] R2 Bucket 已创建（如使用 R2）
- [ ] 自定义域名 DNS 已配置
- [ ] `bun run db:push` 已执行同步 schema
- [ ] 前端 API URL 指向 Worker 域名
