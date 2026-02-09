# Atlas FE

Atlas FE 是一个前端面试复习社区，包含题库练习、八股文和管理员后台。

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Supabase (Auth + Database)
- Tailwind CSS

## 本地启动

1. 安装依赖

```bash
pnpm install
```

2. 配置环境变量

```bash
cp .env.example .env.local
```

3. 运行开发环境

```bash
pnpm dev
```

## 环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 仅服务端管理接口使用 |
| `ADMIN_EMAIL_ALLOWLIST` | 是 | 管理员邮箱白名单，逗号分隔 |
| `GEMINI_API_KEY` | 否 | 题目 AI 优化功能使用 |
| `GEMINI_MODEL` | 否 | 默认为 `gemini-3-flash-preview` |

## Supabase 初始化

需要在 Supabase 中准备以下表（字段名需与代码一致）：

- `admin_questions`
- `admin_notes`

此外请确保：

- 已启用 Google OAuth（用于登录）
- 管理员账号邮箱在 `ADMIN_EMAIL_ALLOWLIST` 内
- 面向公开页面的读取策略允许读取 `is_published = true` 的数据

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## CI

仓库内置 CI：`/.github/workflows/ci.yml`，会在 push / PR 时执行：

- lint
- typecheck
- test
- build

## Vercel 部署

1. 导入仓库到 Vercel
2. 在 Vercel Project Settings 中配置环境变量（Preview/Production 分开配置）
3. 先做 Preview 部署验证
4. 通过后再 Promote 到 Production

建议在上线前完成冒烟：

- 游客访问首页、题库、知识点页
- 普通用户登录后访问
- 管理员登录后新增/发布题目和八股文
- 前台可看到新发布内容

## 在线判题链路（WebContainer + Vitest）

题库运行按钮在浏览器端完成执行，流程为：

1. 启动浏览器内 WebContainer（Node 运行时）
2. 写入 `solution.ts`、`tests.spec.ts` 与 `vitest` 配置
3. 安装依赖并执行 `vitest run --reporter=json`
4. 解析 JSON 报告并在页面展示用例通过情况与运行日志

该方案无需单独部署判题服务，但不适合作为强对抗场景的可信判题后端。

## 回滚策略

- Vercel 回滚到上一个稳定 Deployment
- 若数据结构变更，保持数据库迁移可回退（向后兼容优先）
