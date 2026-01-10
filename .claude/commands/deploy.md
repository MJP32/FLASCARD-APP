---
allowed-tools: Bash(git:*), Bash(npm run:*), Read, Glob
description: Run pre-deployment checks and prepare for Vercel deployment
---

Help the user prepare and deploy to Vercel.

## Pre-Deployment Checklist

Run these checks before deploying:

1. **Check for uncommitted changes**
   ```
   git status
   ```

2. **Run linting**
   ```
   npm run lint
   ```

3. **Run tests**
   ```
   npm test -- --watchAll=false --passWithNoTests
   ```

4. **Create production build locally**
   ```
   npm run build
   ```

5. **Verify environment variables**
   - Check that `.env.example` documents all required variables
   - Remind user to set these in Vercel dashboard

## Deployment

Vercel deploys automatically when you push to the main branch:

1. Commit all changes
2. Push to origin: `git push origin master`
3. Vercel will automatically build and deploy

## Check Deployment Status

Direct users to:
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Actions: Check the repository's Actions tab

## Troubleshooting

If deployment fails:
1. Check Vercel build logs in the dashboard
2. Verify all environment variables are set in Vercel
3. Ensure `npm run build` succeeds locally
4. Check for any hardcoded localhost URLs that should be environment variables
