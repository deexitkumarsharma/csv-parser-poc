# Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Gemini API Key (using the provided key for testing)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/csv-parser-poc.git
cd csv-parser-poc
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=AIzaSyAu87G3Fde8a-93aErdDJlhE2QtbCiFTKM
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This will start:
- Backend API on http://localhost:8000
- Frontend on http://localhost:3000
- Redis cache
- PostgreSQL database

### 4. Access the Application

Open http://localhost:3000 in your browser.

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Testing the Application

### 1. Upload Sample Data

Use the provided sample files in the `/samples` directory:
- `equipment_inventory.csv` - Messy automotive data
- `driver_database.csv` - Personnel data with formatting issues

### 2. Review AI Mappings

The system will automatically suggest column mappings using Gemini AI.

### 3. Validate & Clean

Watch as the AI identifies and fixes data quality issues.

### 4. Export Results

Download your cleaned data in CSV, Excel, or JSON format.

## API Documentation

Access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Port Conflicts

If ports 3000 or 8000 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

### API Key Issues

Ensure your Gemini API key is valid and has sufficient quota.

### Database Connection

If you see database errors:
```bash
docker-compose down -v
docker-compose up -d
```

## Next Steps

- Review the [Architecture](ARCHITECTURE.md) documentation
- Explore the API endpoints
- Try different business contexts (insurance, automotive, etc.)
- Monitor costs in the Metrics tab