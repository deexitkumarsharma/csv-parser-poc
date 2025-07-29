# Troubleshooting Guide

## Common Issues and Solutions

### 1. Backend Won't Start

#### Error: `ModuleNotFoundError`
**Solution:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### Error: `GEMINI_API_KEY Field required`
**Solution:**
```bash
export GEMINI_API_KEY=AIzaSyAu87G3Fde8a-93aErdDJlhE2QtbCiFTKM
# Or use the start_local.sh script which sets this automatically
```

#### Error: `[Errno 48] Address already in use`
**Solution:**
```bash
# Kill the process using port 8000
lsof -ti:8000 | xargs kill -9
# Then restart the backend
```

### 2. Frontend Won't Start

#### Error: `No matching export in "src/App.tsx" for import "default"`
**Solution:** This has been fixed. Pull the latest changes:
```bash
git pull
```

#### Error: `Cannot find module '@/lib/utils'`
**Solution:** The imports have been updated. Make sure you have the latest code.

#### Error: Port 3000 already in use
**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Then restart the frontend
```

### 3. Docker Issues

#### Error: `docker-compose: command not found`
**Solution:** Use the new Docker Compose syntax:
```bash
docker compose up -d  # Note the space between 'docker' and 'compose'
```

#### Error: `Cannot connect to the Docker daemon`
**Solution:** Make sure Docker Desktop is running, or use the local development setup instead.

### 4. Redis Connection Errors

**Note:** Redis is optional. The application will work without it, just without caching.

If you see: `Failed to connect to Redis`
- This is not a critical error
- The app will function normally without caching
- To enable caching, install and start Redis locally

### 5. Quick Fixes

#### Reset Everything
```bash
# Stop all services
pkill -f uvicorn
pkill -f "npm run dev"

# Clean and restart
cd backend && rm -rf venv && cd ..
cd frontend && rm -rf node_modules && cd ..

# Use the startup script
./start_local.sh
```

#### Use Individual Commands
Instead of the startup script, you can run services manually:

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=AIzaSyAu87G3Fde8a-93aErdDJlhE2QtbCiFTKM
uvicorn app.main:app --reload --port 8000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev
```

## Still Having Issues?

1. Check that you have:
   - Python 3.11+ installed
   - Node.js 18+ installed
   - The latest code from the repository

2. Try the simplified startup:
   ```bash
   ./start_local.sh
   ```

3. Check the logs for specific error messages

4. Ensure ports 3000 and 8000 are not in use by other applications