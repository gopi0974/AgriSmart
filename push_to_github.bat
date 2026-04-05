@echo off
echo ===========================================
echo   AgriSmart GitHub Push Assistant
echo ===========================================
echo.
set /p repo_url="Enter your GitHub Repository URL (e.g., https://github.com/user/repo.git): "

if "%repo_url%"=="" (
    echo [ERROR] No URL entered. Exiting...
    pause
    exit /b
)

echo.
echo [1/3] Adding remote...
git remote remove origin >nul 2>&1
git remote add origin %repo_url%

echo [2/3] Setting branch to main...
git branch -M main

echo [3/3] Pushing to GitHub...
echo.
echo NOTE: A login popup may appear. Please follow the instructions to log in.
git push -u origin main

echo.
echo ===========================================
echo   SUCCESS! Your code should be on GitHub.
echo ===========================================
pause
