# Sticker Maker — Custom Text Overlay

A web app that overlays custom text on character sticker images from **Project Sekai** and **Arcaea**. Built with Next.js and server-side canvas rendering.

## Features

- **26 PJSK characters**, **20 Arcaea characters** with hundreds of expression variants
- **Character grid** grouped by name with accent-color dots and variant counts
- **Custom text** with multi-line support (`/+/` or `\n` for line breaks)
- **Live preview** — generated sticker updates as you type
- **Two fonts** — YurukaStd and ShangShou FangTangTi
- **Color picker** — native color input + hex code editor + clear buttons
- **Background** — single color, gradient (2 colors), or transparent
- **Download PNG** — save the generated sticker
- **Copy URL** — share the sticker link directly

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [@napi-rs/canvas](https://github.com/napi-rs/canvas) — server-side image rendering
- [arcpjsk-hub](https://github.com/kamicry/arcpjsk-hub) — character configuration data

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `GET /api/overlay-text`

Generates a PNG with text overlaid on a character image.

| Param | Type | Description |
|---|---|---|
| `path` | `string` | URL of the base character image |
| `key` | `string` | Text to overlay (`/+/` or `\n` for newline) |
| `character` | `string` | Character ID from config |
| `type` | `string` | `pjsk` or `arcaea` (default: `pjsk`) |
| `font` | `string` | `YurukaStd` or `SSFangTangTi` (default: `YurukaStd`) |
| `bg` | `string` | Background color: hex (`#ff0`), `w`/`b`/`t` (white/black/transparent) |
| `bg2` | `string` | Second color for gradient |

### `GET /api/health`

Health check that reports character config load status.

### `GET /api/status`

Lists registered canvas fonts.

## Vercel Deploy

A [`vercel.json`](./vercel.json) is included with:
- 30s function timeout for the overlay API
- CORS headers on API routes
- Required environment variables pre-configured

## Environment Variables

See `.env.local` for local overrides:

| Variable | Default |
|---|---|
| `CHARACTERS_URL_PJSK` | GitHub raw URL for PJSK characters.json |
| `CHARACTERS_URL_ARCAEA` | GitHub raw URL for Arcaea characters.json |
| `FONT_YURUKA_URL` | Remote URL for YurukaStd font |
| `FONT_SSFANG_URL` | Remote URL for ShangShouFangTangTi font |

## License

MIT
