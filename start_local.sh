#!/bin/bash

echo "🚀 Starting LLM-Powered CSV Parser..."

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Export environment variables
export GEMINI_API_KEY=AIzaSyAu87G3Fde8a-93aErdDJlhE2QtbCiFTKM

# Start backend in background
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo "✅ Backend started on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"

# Start frontend
echo "🎨 Starting frontend..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "✅ Starting frontend on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Application is starting!"
echo ""
echo "📝 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait