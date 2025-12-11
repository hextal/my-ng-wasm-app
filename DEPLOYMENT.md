# GitHub Pages Deployment Guide

## Step 1: Create GitHub Repository

Since GitHub CLI is not installed, follow these steps to create the repository manually:

### Option A: Using GitHub Website
1. Go to https://github.com/new
2. Repository name: `my-ng-wasm-app` (or your preferred name)
3. Description: "WASM-powered image editor with drag-and-drop functionality"
4. Choose: **Public** (required for free GitHub Pages)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Option B: Install GitHub CLI (Recommended)
```bash
# Download and install from: https://cli.github.com/
# Then run:
gh auth login
gh repo create my-ng-wasm-app --public --source=. --remote=origin
```

## Step 2: Configure Git Remote

After creating the repository on GitHub, connect your local repository:

```bash
cd "C:\Users\hassan.talpur\projects\angular-image-editor\my-ng-wasm-app"

# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/my-ng-wasm-app.git

# Verify the remote was added
git remote -v
```

## Step 3: Update Deployment Configuration

**IMPORTANT**: You need to update the base-href in the workflow file to match your repository name.

1. Open `.github/workflows/deploy.yml`
2. Find line 29: `run: bun run build --base-href=/my-ng-wasm-app/`
3. If your repository name is different, change `/my-ng-wasm-app/` to `/YOUR-REPO-NAME/`
4. Save the file

## Step 4: Commit and Push Your Code

```bash
# Stage all changes
git add .

# Commit the changes
git commit -m "feat: add WASM image editor with drag-and-drop functionality

- Add draggable icons, text, and shapes
- Real-time size and color adjustments
- Photon-WASM integration for image processing
- GitHub Pages deployment workflow
- Remove video editor tab"

# Push to GitHub
git push -u origin 001-wasm-media-editor

# Or if you want to push to main branch:
# git checkout -b main
# git push -u origin main
```

## Step 5: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/my-ng-wasm-app`
2. Click on **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

## Step 6: Trigger Deployment

The deployment will automatically start when you push code. To monitor:

1. Go to the **Actions** tab in your repository
2. You should see a workflow run called "Deploy to GitHub Pages"
3. Click on it to see the progress
4. Wait for both "build" and "deploy" jobs to complete (usually 2-5 minutes)

Alternatively, you can manually trigger the workflow:
1. Go to **Actions** tab
2. Click "Deploy to GitHub Pages" in the left sidebar
3. Click "Run workflow" button
4. Select your branch and click "Run workflow"

## Step 7: Access Your Deployed Site

Once deployment is complete, your site will be available at:

```
https://YOUR_USERNAME.github.io/my-ng-wasm-app/
```

## Troubleshooting

### Issue: 404 Page Not Found
**Solution**: 
- Ensure the `base-href` in `.github/workflows/deploy.yml` matches your repository name
- Check that GitHub Pages is enabled and set to "GitHub Actions" source
- Wait a few minutes after deployment completes

### Issue: CSS/Assets Not Loading
**Solution**:
- Verify `base-href` is set correctly (must include trailing slash)
- Check browser console for 404 errors
- Ensure `.nojekyll` file exists in the `public` folder

### Issue: Workflow Fails
**Solution**:
- Check the Actions tab for error messages
- Ensure all dependencies are listed in `package.json`
- Verify Bun installation step in workflow

### Issue: WASM Files Not Loading
**Solution**:
- Check that WASM files are in `dist/my-ng-wasm-app/browser/assets/photon-wasm/`
- Verify CORS headers are not blocking WASM loading
- Check browser console for specific WASM errors

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public` folder with your domain name
2. Configure DNS settings at your domain provider:
   ```
   Type: CNAME
   Name: www (or @)
   Value: YOUR_USERNAME.github.io
   ```
3. In GitHub repository settings > Pages, add your custom domain
4. Wait for DNS propagation (can take up to 24 hours)

## Updating Your Site

To update your deployed site, simply push changes to your branch:

```bash
git add .
git commit -m "Your commit message"
git push
```

The GitHub Action will automatically rebuild and redeploy your site.

## Notes

- First deployment might take longer as it sets up the Pages environment
- Subsequent deployments are faster
- The site serves static files from `dist/my-ng-wasm-app/browser/`
- SSR (Server-Side Rendering) is NOT supported on GitHub Pages (static hosting only)
- Free GitHub Pages has a 1GB size limit and 100GB bandwidth/month
