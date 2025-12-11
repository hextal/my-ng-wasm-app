@echo off
setlocal enabledelayedexpansion

echo ======================================
echo   GitHub Pages Deployment Setup
echo ======================================
echo.

REM Check if git remote exists
git remote | findstr "origin" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No git remote found
    echo.
    echo Please follow these steps:
    echo 1. Create a repository on GitHub: https://github.com/new
    echo 2. Repository name: my-ng-wasm-app ^(or your preferred name^)
    echo 3. Make it PUBLIC ^(required for free GitHub Pages^)
    echo 4. Don't initialize with README
    echo.
    echo Then run this command ^(replace YOUR_USERNAME^):
    echo   git remote add origin https://github.com/YOUR_USERNAME/my-ng-wasm-app.git
    echo.
    pause
    exit /b 1
)

echo [OK] Git remote 'origin' exists
git remote -v
echo.

echo Repository Information:
for /f "tokens=*" %%i in ('git remote get-url origin') do set REPO_URL=%%i
echo   Remote URL: !REPO_URL!

REM Extract repository name
for %%a in (!REPO_URL!) do set REPO_NAME=%%~na
echo   Repository: !REPO_NAME!
echo.

echo Checking base-href in workflow...
findstr /C:"base-href=/!REPO_NAME!/" .github\workflows\deploy.yml >nul 2>&1
if errorlevel 1 (
    echo [WARNING] base-href may need updating in .github\workflows\deploy.yml
    echo   Should be: --base-href=/!REPO_NAME!/
) else (
    echo [OK] base-href is correctly set to /!REPO_NAME!/
)
echo.

echo Staging files for commit...
git add .
echo.

echo Creating commit...
git commit -m "feat: add WASM image editor with GitHub Pages deployment" -m "- Add draggable icons, text, and shapes with real-time adjustments" -m "- Integrate Photon-WASM for high-performance image processing" -m "- Configure GitHub Pages deployment workflow" -m "- Add comprehensive documentation" -m "- Remove video editor tab"
echo.

echo Current branch:
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo   !CURRENT_BRANCH!
echo.

set /p PUSH="Do you want to push to origin? (y/n): "
if /i "!PUSH!"=="y" (
    echo.
    echo Pushing to origin/!CURRENT_BRANCH!...
    git push -u origin !CURRENT_BRANCH!
    
    echo.
    echo [SUCCESS] Code pushed successfully!
    echo.
    echo ========================================
    echo   Next Steps:
    echo ========================================
    echo 1. Go to your repository settings:
    echo    https://github.com/YOUR_USERNAME/!REPO_NAME!/settings/pages
    echo.
    echo 2. Under 'Source', select 'GitHub Actions'
    echo.
    echo 3. Go to Actions tab to monitor deployment:
    echo    https://github.com/YOUR_USERNAME/!REPO_NAME!/actions
    echo.
    echo 4. Your site will be available at:
    echo    https://YOUR_USERNAME.github.io/!REPO_NAME!/
    echo.
    echo For detailed instructions, see DEPLOYMENT.md
) else (
    echo.
    echo Push cancelled. Run this when ready:
    echo   git push -u origin !CURRENT_BRANCH!
)

echo.
echo Setup complete!
echo.
pause
