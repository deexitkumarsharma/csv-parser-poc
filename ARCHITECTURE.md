# Architecture Overview

## System Architecture

The LLM-Powered CSV Parser is built with a modern microservices architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - TypeScript + Vite                                        │
│  - Tailwind CSS + shadcn/ui                               │
│  - React Query + Zustand                                   │
│  - WebSocket for real-time updates                         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  - Async Python with type hints                            │
│  - WebSocket support                                       │
│  - Background jobs with Celery                             │
│  - Structured logging                                      │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   Redis     │ │  PostgreSQL │ │  Gemini AI  │
        │   Cache     │ │   Database  │ │     API     │
        └─────────────┘ └─────────────┘ └─────────────┘
```

## Key Design Decisions

### 1. Tiered LLM Integration

We use a three-tier approach to balance cost and performance:

1. **Pattern Matching (Tier 1)**: Fast, cached regex patterns for common mappings
2. **Cached LLM Results (Tier 2)**: Previously seen patterns stored in Redis
3. **Fresh LLM Calls (Tier 3)**: New patterns sent to Gemini API

### 2. Streaming Architecture

- Large files are processed in chunks
- WebSocket connections provide real-time progress updates
- Background jobs handle files > 5MB

### 3. Cost Optimization

- Redis caching with 7-day TTL for mappings
- Batch processing for multiple similar columns
- Token usage tracking and cost estimation

## Data Flow

1. **Upload**: File uploaded via multipart form data
2. **Parsing**: Pandas reads CSV/Excel with encoding detection
3. **Mapping**: LLM suggests column mappings based on context
4. **Validation**: AI-generated rules validate data integrity
5. **Cleaning**: LLM assists in standardizing data formats
6. **Export**: Cleaned data available in multiple formats

## Security Considerations

- API key encryption at rest
- Input validation and sanitization
- Rate limiting per user/IP
- Secure file upload with type validation

## Scalability

- Horizontal scaling via Docker Swarm/Kubernetes
- Database connection pooling
- Queue-based job processing
- CDN for static assets

## Monitoring

- Prometheus metrics for performance tracking
- Structured logging with correlation IDs
- Cost tracking per operation
- Error tracking with Sentry integration