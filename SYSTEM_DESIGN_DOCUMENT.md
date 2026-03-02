# System Design Document – LeetCode & LLD Backend

This document explains the high-level system design, architecture decisions, scalability considerations, and resilience mechanisms of the backend.

---

# 1. High-Level Overview

The backend is a modular, layered Node.js service built using **Hono** and **MongoDB**, designed to support:

- DSA problem management
- Custom DSA lists
- LLD question practice
- LLD answer submission and rating
- AI-powered semantic search using OpenAI embeddings

The architecture follows a clean layered pattern:

```
Client → Routes → Controllers → Services → Repositories → MongoDB
                                   ↓
                               OpenAI API
```

---

# 2. Architectural Layers

## 2.1 Routes Layer

Responsible for:
- HTTP method binding
- Applying middleware (auth, rate limit, asyncHandler)
- Passing control to controllers

Routes are intentionally thin and do not contain business logic.

---

## 2.2 Controller Layer

Responsibilities:
- Input validation (Zod)
- Extract request data
- Call service methods
- Return standardized responses

Controllers do NOT:
- Access the database directly
- Handle low-level errors

All errors are delegated to a centralized async error handler.

---

## 2.3 Service Layer

Contains core business logic:
- Authentication
- List operations
- LLD submission logic
- Embedding similarity search

Services coordinate between repositories and external APIs.

---

## 2.4 Repository Layer

Handles:
- Direct MongoDB queries
- Index usage
- Data retrieval optimization

Repositories isolate database concerns from business logic.

---

# 3. Authentication Design

## 3.1 JWT-Based Authentication

- Stateless authentication
- Signed using strong 32+ character secret
- 7-day expiration

Advantages:
- Horizontal scaling friendly
- No session store required

---

## 3.2 Google OAuth Verification

Flow:
1. Frontend sends Google `idToken`
2. Backend verifies token signature
3. Extracts verified `sub` and `email`
4. Creates or links user

Security Benefit:
- Prevents identity spoofing
- Eliminates client-trusted identity risk

---

# 4. Database Design

## 4.1 MongoDB

Collections:
- users
- dsa_problems
- dsa_lists
- lld_questions
- lld_answers

Indexes:
- Unique index on `users.email`
- Index on `users.googleId`

Reasoning:
- Fast lookups
- Prevent duplicates
- Scalable query performance

---

# 5. API Standardization

All responses follow:

```
{
  success: boolean,
  data: any,
  error: { code, message } | null,
  requestId: string
}
```

Benefits:
- Predictable frontend handling
- Easier debugging
- Unified error surface

---

# 6. Error Handling Strategy

Centralized async error handler:

- Controllers throw `AppError`
- Middleware converts errors to standardized responses
- Logs include requestId

Benefits:
- No duplicated try/catch
- Consistent error formatting
- Cleaner codebase

---

# 7. Performance Design

## 7.1 Pagination Enforcement

- Default limit = 20
- Max limit = 100
- Prevents large payload responses

Reasoning:
- Protect memory
- Prevent DB overload
- Ensure scalable queries

---

## 7.2 Query Projection

- Only necessary fields returned

Benefit:
- Reduced network payload
- Faster MongoDB operations

---

## 7.3 Compression

- Gzip compression enabled

Benefit:
- Reduced bandwidth
- Faster client responses

---

# 8. OpenAI Integration Design

## 8.1 Embedding Search

Steps:
1. Generate embedding for user query
2. Retrieve stored embeddings
3. Compute cosine similarity
4. Sort and rank
5. Optional LLM reranking

---

## 8.2 Resilience Mechanisms

Implemented:
- 8s timeout
- 3 retries with exponential backoff
- Circuit breaker (5 failures → temporary shutdown)

Reasoning:
- Prevent API hangs
- Handle transient failures
- Avoid cascading outages

---

# 9. Caching Strategy

In-memory TTL cache for:
- Public DSA lists
- LLD questions

Characteristics:
- 60s TTL
- Bounded size (500 entries)

Purpose:
- Reduce DB load
- Improve latency

Future upgrade:
- Replace with Redis for distributed environments

---

# 10. Observability

## Request ID Middleware
- Unique ID per request
- Included in logs and responses

## Structured Logging
- JSON logs
- Includes method, path, duration, requestId

## Metrics Endpoint
`/metrics`

Provides:
- Uptime
- Memory usage
- Request count

## Health Endpoints
- `/health`
- `/health/ready`

Designed for container orchestration readiness.

---

# 11. Scalability Considerations

Current design supports:
- Stateless authentication
- Horizontal scaling
- Caching
- DB indexing
- Controlled query size
- Upstream failure protection

To scale further:
- Redis cache
- Dedicated search service
- Background job queue
- Read replicas for MongoDB

---

# 12. Security Summary

- Verified Google authentication
- Strong JWT secret
- Rate limiting
- Strict CORS
- Request size limit
- Indexed DB
- Centralized error handling

---

# Final Architecture Quality

This backend now operates at:

- Production-grade reliability
- Clean layered architecture
- High observability
- Resilient external API integration
- Controlled scalability patterns

It is suitable for:
- Startup deployment
- Technical interview demonstration
- Portfolio showcase
- Early-stage production environments
