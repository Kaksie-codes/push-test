@echo off
echo 🚀 Setting up Social Media App...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Create environment files if they don't exist
echo 📝 Setting up environment files...

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo ✅ Created backend\.env from example
    echo ⚠️  Please edit backend\.env with your actual values
) else (
    echo ⚠️  backend\.env already exists
)

if not exist "frontend\.env.local" (
    copy "frontend\.env.local.example" "frontend\.env.local"
    echo ✅ Created frontend\.env.local from example
    echo ⚠️  Please edit frontend\.env.local with your actual values
) else (
    echo ⚠️  frontend\.env.local already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit backend\.env with your MongoDB Atlas, Gmail, and Firebase credentials
echo 2. Edit frontend\.env.local with your Firebase web app credentials
echo 3. Run 'npm run dev' to start both frontend and backend
echo.
echo For detailed setup instructions, see README.md
pause