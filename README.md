# Sticker Maker — 自定义文字贴图

在 **Project Sekai** 和 **Arcaea** 角色贴图上叠加自定义文字。基于 Next.js 服务端 Canvas 渲染。

## 功能

- **26 个 PJSK 角色**、**20 个 Arcaea 角色**，数百种表情变体
- **角色网格**按名称分组，带角色色圆点和变体数量标记
- **自定义文字**，支持多行（`/+/` 或 `\n` 换行）
- **实时预览** — 输入即时生成贴图
- **两种字体** — YurukaStd 和 上首方糖体
- **调色盘** — 原生颜色选择器 + 手动输入 Hex + 清除按钮
- **背景** — 单色、渐变（双色）、透明
- **下载 PNG** — 保存生成的贴图
- **复制链接** — 直接分享贴图 URL

## 技术栈

- [Next.js](https://nextjs.org/) 16（App Router）
- [Tailwind CSS](https://tailwindcss.com/) v4
- [@napi-rs/canvas](https://github.com/napi-rs/canvas) — 服务端图片渲染
- [arcpjsk-hub](https://github.com/kamicry/arcpjsk-hub) — 角色配置数据

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## API

### `GET /api/overlay-text`

生成一张在角色图片上叠加文字的 PNG 图片。

| 参数 | 类型 | 说明 |
|---|---|---|
| `path` | `string` | 角色图片的 URL |
| `key` | `string` | 要叠加的文字（`/+/` 或 `\n` 换行） |
| `character` | `string` | 角色配置中的 ID |
| `type` | `string` | `pjsk` 或 `arcaea`（默认 `pjsk`） |
| `font` | `string` | `YurukaStd` 或 `SSFangTangTi`（默认 `YurukaStd`） |
| `bg` | `string` | 背景颜色：Hex（`#ff0`）、`w`/`b`/`t`（白/黑/透明） |
| `bg2` | `string` | 渐变的第二种颜色 |

### `GET /api/health`

健康检查，返回角色配置加载状态。

### `GET /api/status`

列出已注册的 Canvas 字体。

## Vercel 部署

内置 [`vercel.json`](./vercel.json)，包含：
- API 函数 30 秒超时限制
- API 路由 CORS 头
- 预设环境变量

## 环境变量

参考 `.env.local` 进行本地覆盖：

| 变量 | 默认值 |
|---|---|
| `CHARACTERS_URL_PJSK` | PJSK characters.json 的 GitHub 地址 |
| `CHARACTERS_URL_ARCAEA` | Arcaea characters.json 的 GitHub 地址 |
| `FONT_YURUKA_URL` | YurukaStd 字体远程地址 |
| `FONT_SSFANG_URL` | 上首方糖体远程地址 |

## 许可证

MIT
