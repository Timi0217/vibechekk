# Vibechekk 🚀

**Trajectory of Merit for Developers**

Vibechekk is a Chrome extension that analyzes GitHub profiles to reveal developer archetypes, code quality, and AI usage patterns. Built for technical recruiters who want to go beyond resumes and star counts.

![Vibechekk Demo](https://vibechekk.dev/demo.png)

## ✨ Features

- **15 Developer Archetypes** - From "THE 10X ENGINEER" to "THE HIDDEN GEM", classify developers into meaningful categories
- **AI Detection** - Know if candidates use Copilot, ChatGPT, or Claude in their workflow
- **Code Quality Analysis** - Tests, CI/CD, TypeScript adoption, and more
- **Instant Reports** - Get recruiter-ready assessments in seconds
- **Autochekk Mode** - Automatically analyze profiles as you browse GitHub
- **Bulk Analysis** - Upload CSV files and analyze multiple candidates at once (Pro)

## 🏗️ Architecture

This monorepo contains three main components:

```
vibechekk/
├── src/              # Chrome Extension (React + Vite)
├── server/           # Backend API (Express + Prisma + PostgreSQL)
└── landing/          # Marketing Site (Next.js)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- GitHub API Token
- DeepSeek API Key

### Extension Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build extension
npm run build:ext
```

Load the `dist/` folder as an unpacked extension in Chrome (`chrome://extensions`).

### Backend Development

```bash
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
npx prisma db push

# Start dev server
npm run dev
```

### Landing Page Development

```bash
cd landing

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing (generate with `openssl rand -base64 32`) |
| `GITHUB_API_TOKEN` | GitHub Personal Access Token |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI analysis |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Landing Page (`landing/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL |
| `NEXT_PUBLIC_EXTENSION_URL` | Chrome Web Store URL |

## 📦 Deployment

### Backend (Railway)

1. Connect your GitHub repository to Railway
2. Set the root directory to `server`
3. Add all environment variables
4. Deploy!

### Landing Page (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `landing`
3. Add environment variables
4. Deploy with `vercel --prod`

### Chrome Extension

1. Build with `npm run build:ext`
2. Zip the `dist/` folder
3. Submit to Chrome Web Store

## 🎯 Archetypes

| Tier | Archetypes |
|------|------------|
| **LEGENDARY** (Top 1%) | THE 10X ENGINEER, THE TITAN |
| **ULTRA RARE** (Top 5%) | THE ARCHITECT, THE DOMAIN MASTER, THE OSS STAR |
| **RARE** (Top 15%) | THE SPECIALIST, THE EDUCATOR, THE RISING STAR |
| **UNCOMMON** (Top 30%) | THE BUILDER, THE CONTRIBUTOR, THE CRAFTSPERSON, THE HIDDEN GEM |
| **COMMON** (Top 50%) | THE TINKERER, THE JOURNEYMAN, THE EXPLORER, THE APPRENTICE |

## 🛡️ Security

- JWT-based authentication
- CORS restricted to known origins
- Rate limiting (60 req/min per IP)
- No storage of sensitive GitHub data

## 📄 License

Proprietary - All rights reserved.

## 🤝 Support

- Email: support@vibechekk.dev
- Twitter: [@vibechekk](https://twitter.com/vibechekk)

---

Made with ❤️ for technical recruiters who want to find exceptional developers.
