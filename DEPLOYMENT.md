# Backend Deployment Guide

## Deploying to Vercel

Your backend is configured to deploy to Vercel, which is perfect for your stack (Hono + MongoDB + bcrypt).

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally if not already installed
   ```bash
   npm i -g vercel
   ```

### Setup Steps

#### 1. Install Dependencies

```bash
bun install
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Set Environment Variables

You need to add these environment variables in your Vercel project settings:

**Via Vercel Dashboard** (Recommended):
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (or create it on first deployment)
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `JWT_SECRET`: Your JWT secret (32+ characters)
   - `FRONTEND_URL`: Your frontend URL (e.g., https://your-app.vercel.app)
   - `GOOGLE_CLIENT_ID` (optional): Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` (optional): Your Google OAuth client secret

**Via CLI** (Alternative):
```bash
# Add environment variables
vercel env add MONGODB_URI
vercel env add OPENAI_API_KEY
vercel env add JWT_SECRET
vercel env add FRONTEND_URL
```

#### 4. Deploy

**Deploy to Preview** (for testing):
```bash
bun run deploy:preview
# or
vercel
```

**Deploy to Production**:
```bash
bun run deploy
# or
vercel --prod
```

### Available Scripts

- `bun run dev` - Run local development server
- `bun run start` - Run production server locally
- `bun run build` - Build command (not needed for Vercel, handled automatically)
- `bun run deploy:preview` - Deploy to Vercel preview environment
- `bun run deploy` - Deploy to Vercel production
- `bun import:lld` - Import LLD data script

### First Deployment

On your first deployment, Vercel will:
1. Ask you to link to an existing project or create a new one
2. Detect your build settings automatically
3. Deploy your application
4. Provide you with a URL (e.g., https://your-project.vercel.app)

**Example first deployment:**
```bash
vercel

# Follow the prompts:
# ? Set up and deploy "~/projects/leetcode_and_lld/backend"? [Y/n] y
# ? Which scope do you want to deploy to? Your Name
# ? Link to existing project? [y/N] n
# ? What's your project's name? leetcode-lld-backend
# ? In which directory is your code located? ./
```

### Environment-Specific Deployments

Vercel automatically creates different environments:
- **Production**: Deployments from the main branch or via `vercel --prod`
- **Preview**: Deployments from other branches or via `vercel`

### Configuration Details

The `vercel.json` file is configured with:
- **Runtime**: `@vercel/node` for Node.js runtime
- **Entry Point**: `src/index.ts`
- **Install Command**: `bun install` (uses Bun for faster installs)
- **No Build Step**: Vercel handles TypeScript compilation automatically

### Local Development

For local development, simply use:
```bash
bun run dev
```

This will start your server on the port specified in your `.env` file (default: 3000).

### Monitoring and Logs

**View Logs**:
```bash
vercel logs [deployment-url]
```

**View in Dashboard**:
Visit [vercel.com/dashboard](https://vercel.com/dashboard) to see:
- Deployment status
- Real-time logs
- Analytics
- Performance metrics

### Custom Domain

To add a custom domain:
1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Update your DNS records as instructed

### Troubleshooting

#### Build Fails
- Make sure all dependencies are in `package.json`
- Check that TypeScript files have no errors
- Verify environment variables are set

#### Runtime Errors
- Check logs: `vercel logs [deployment-url]`
- Verify MongoDB connection string is correct
- Ensure all required environment variables are set

#### CORS Issues
- Update `FRONTEND_URL` environment variable
- Make sure it matches your frontend domain exactly

### Important Notes

1. **No Build Required**: Unlike Cloudflare Workers, Vercel handles TypeScript compilation automatically
2. **MongoDB Compatible**: Full MongoDB driver support (unlike edge runtimes)
3. **bcrypt Works**: Native Node.js modules work perfectly on Vercel
4. **Connection Pooling**: MongoDB connections are automatically managed by Vercel's runtime
5. **Cold Starts**: First request after inactivity may be slower (this is normal for serverless)

### Production Checklist

Before deploying to production:
- [ ] Set all environment variables in Vercel dashboard
- [ ] Update `FRONTEND_URL` to production frontend URL
- [ ] Test with preview deployment first
- [ ] Verify MongoDB connection works
- [ ] Check CORS configuration
- [ ] Test all API endpoints
- [ ] Monitor logs after deployment

## Alternative: Deploy to Railway, Render, or Fly.io

If you prefer a traditional always-on server instead of serverless:

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render
1. Connect your GitHub repository
2. Create a new Web Service
3. Set build command: `bun install`
4. Set start command: `bun run start`
5. Add environment variables

### Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch
fly deploy
```

## Recommended: Vercel

For your stack, **Vercel is recommended** because:
✅ Excellent TypeScript support  
✅ Works with MongoDB out of the box  
✅ Fast deployments  
✅ Free tier is generous  
✅ Automatic HTTPS  
✅ Great developer experience  

