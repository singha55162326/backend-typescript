# Scalability Improvements for 5000 Users

This document outlines the scalability improvements implemented to support up to 5000 concurrent users with MongoDB Atlas free tier.

## Key Improvements

### 1. Database Connection Optimization

- **Increased Connection Pool**: Configured `maxPoolSize` to 50 connections
- **Connection Retry Logic**: Added automatic retry with exponential backoff
- **Connection Monitoring**: Implemented connection status tracking

### 2. Caching Layer

- **In-Memory Caching**: Implemented NodeCache for frequently accessed data
- **Cache Strategies**:
  - Stadium data (5-minute TTL)
  - Field data (5-minute TTL)
  - Availability data (1-minute TTL)
  - User data (5-minute TTL)
  - Booking data (2-minute TTL)
- **Cache Invalidation**: Automatic invalidation on data changes

### 3. Horizontal Scaling with Clustering

- **Node.js Clustering**: Implemented multi-process architecture using Node.js cluster module
- **Load Distribution**: Automatic distribution of requests across worker processes
- **Graceful Shutdown**: Proper handling of SIGTERM and SIGINT signals
- **Worker Restart**: Automatic restart of failed workers

### 4. Performance Optimizations

- **Database Indexes**: Added optimized indexes for common queries
- **Booking Number Generation**: Replaced `countDocuments()` with timestamp-based generation
- **Selective Field Projection**: Reduced data transfer by selecting only needed fields
- **Query Optimization**: Improved query patterns for availability checking

### 5. Comprehensive Monitoring

- **Request Tracking**: Monitoring of all API requests with response times
- **Error Rate Monitoring**: Tracking of error rates and status code distribution
- **Database Metrics**: Connection counts, slow queries, and errors
- **Cache Metrics**: Hit rates, misses, and key counts
- **System Metrics**: CPU usage, memory usage, and load averages
- **Health Checks**: Endpoint for system health status

### 6. Rate Limiting

- **Reduced Limits**: Adjusted rate limiting to 5000 requests per 15 minutes
- **Better Control**: More granular control over request rates

### 7. Containerization Support

- **Docker Support**: Added Dockerfile for containerization
- **Docker Compose**: Configuration for multi-container deployments
- **Environment Configuration**: Support for environment-based configuration

## Deployment Options

### Single Server Deployment

For single server deployments, the application will automatically use clustering based on the number of CPU cores.

### Containerized Deployment

For containerized deployments, use the provided Dockerfile and docker-compose.yml:

```bash
# Build and run with Docker
docker-compose up --build

# Scale the application
docker-compose up --scale app=3
```

### Environment Variables

- `CLUSTER_WORKERS`: Number of worker processes (defaults to CPU count)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string

## Monitoring Endpoints

- `GET /api/monitoring/metrics`: Comprehensive system metrics
- `GET /api/monitoring/health`: System health status
- `GET /api/monitoring/top-slow-endpoints`: Top slow endpoints
- `POST /api/monitoring/reset`: Reset monitoring metrics

## Performance Testing

Use the provided load testing script to verify performance:

```bash
# Run load test
node load-test.js

# Configure with environment variables
CONCURRENT_USERS=100 TEST_DURATION=60 REQUEST_DELAY=100 node load-test.js
```

## Expected Performance

With these improvements, the application should be able to handle:

- **5000 concurrent users** with proper infrastructure
- **Response times under 1000ms** for 95% of requests
- **Error rates below 2%** under normal conditions
- **Graceful degradation** under heavy load

## MongoDB Atlas Free Tier Considerations

While these improvements help with scalability, the MongoDB Atlas free tier has inherent limitations:

- **Connection Limit**: 500 concurrent connections
- **Storage Limit**: 512 MB storage
- **Performance**: Shared resources with other users

For production deployments with 5000 users, consider upgrading to a paid MongoDB tier.