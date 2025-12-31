# Deploying the Vibechekk Landing Page to Vercel

## Quick Start (One-Time Setup)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the landing directory**:
   ```bash
   cd vibechekk/landing
   vercel --prod
   ```

## Continuous Deployment

After the first deployment, you can link your GitHub repo to Vercel for automatic deployments:

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your `vibechekk` repository
4. Set the **Root Directory** to `landing`
5. Vercel will auto-detect Next.js and configure the build

## Environment Variables

Set these in the Vercel dashboard under Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://vibechekk-production.up.railway.app` |
| `NEXT_PUBLIC_EXTENSION_URL` | Your Chrome Web Store URL |

## After Deployment

1. Update `landing/src/lib/constants.ts` with your actual:
   - Chrome Extension ID
   - GitHub repository URL
   
2. Update the CORS allowed origins in `server/src/index.ts` with your new Vercel URL

3. Redeploy both the landing page and the Railway backend
