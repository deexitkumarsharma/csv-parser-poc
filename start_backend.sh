#!/bin/bash
cd backend
source venv/bin/activate
export GEMINI_API_KEY=AIzaSyAu87G3Fde8a-93aErdDJlhE2QtbCiFTKM
export REDIS_URL=redis://localhost:6379
export DATABASE_URL=postgresql://parser_user:parser_pass@localhost:5432/parser_db
uvicorn app.main:app --reload --port 8000