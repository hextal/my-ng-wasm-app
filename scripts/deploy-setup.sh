#!/bin/bash

# GitHub Pages Setup Script for WASM Media Editor
# This script helps you deploy your Angular app to GitHub Pages

echo "🚀 GitHub Pages Deployment Setup"
echo "=================================="
echo ""

# Check if git remote exists
if git remote | grep -q "origin"; then
    echo "✅ Git remote 'origin' already exists"
    git remote -v
else
    echo "❌ No git remote found"
    echo ""
    echo "Please follow these steps:"
    echo "1. Create a repository on GitHub: https://github.com/new"
    echo "2. Repository name: my-ng-wasm-app (or your preferred name)"
    echo "3. Make it PUBLIC (required for free GitHub Pages)"
    echo "4. Don't initialize with README"
    echo ""
    echo "Then run this command (replace YOUR_USERNAME):"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/my-ng-wasm-app.git"
    echo ""
    exit 1
fi

echo ""
echo "📝 Repository Information:"
REPO_URL=$(git remote get-url origin)
echo "  Remote URL: $REPO_URL"

# Extract repository name from URL
REPO_NAME=$(basename -s .git "$REPO_URL")
echo "  Repository: $REPO_NAME"

echo ""
echo "⚙️  Checking base-href in workflow..."
if grep -q "base-href=/$REPO_NAME/" .github/workflows/deploy.yml; then
    echo "✅ base-href is correctly set to /$REPO_NAME/"
else
    echo "⚠️  base-href may need updating in .github/workflows/deploy.yml"
    echo "   Current: $(grep 'base-href=' .github/workflows/deploy.yml || echo 'not found')"
    echo "   Should be: --base-href=/$REPO_NAME/"
fi

echo ""
echo "📦 Staging files for commit..."
git add .

echo ""
echo "💾 Creating commit..."
git commit -m "feat: add WASM image editor with GitHub Pages deployment

- Add draggable icons, text, and shapes with real-time adjustments
- Integrate Photon-WASM for high-performance image processing
- Configure GitHub Pages deployment workflow
- Add comprehensive documentation
- Remove video editor tab"

echo ""
echo "🌐 Current branch:"
git branch --show-current

echo ""
read -p "Do you want to push to origin? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📤 Pushing to origin/$CURRENT_BRANCH..."
    git push -u origin "$CURRENT_BRANCH"
    
    echo ""
    echo "✅ Code pushed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to: https://github.com/YOUR_USERNAME/$REPO_NAME/settings/pages"
    echo "2. Under 'Source', select 'GitHub Actions'"
    echo "3. Go to Actions tab to monitor deployment"
    echo "4. Your site will be at: https://YOUR_USERNAME.github.io/$REPO_NAME/"
    echo ""
    echo "📖 For detailed instructions, see DEPLOYMENT.md"
else
    echo ""
    echo "⏸️  Push cancelled. Run this when ready:"
    echo "  git push -u origin $(git branch --show-current)"
fi

echo ""
echo "✨ Setup complete!"
