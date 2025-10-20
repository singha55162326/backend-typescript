import express from 'express';
import mongoose from 'mongoose';
import os from 'os';
import process from 'process';

interface RequestMetrics {
  timestamp: number;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
}

interface DatabaseMetrics {
  connectionCount: number;
  avgQueryTime: number;
  slowQueries: number;
  errors: number;
}

interface SystemMetrics {
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  loadAverage: number[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
}

class MonitoringService {
  private static instance: MonitoringService;
  private requestMetrics: RequestMetrics[] = [];
  private dbMetrics: DatabaseMetrics = {
    connectionCount: 0,
    avgQueryTime: 0,
    slowQueries: 0,
    errors: 0
  };
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    keys: 0
  };
  private slowQueryThreshold: number = 1000; // ms

  private constructor() {
    this.setupDatabaseListeners();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Setup database event listeners for monitoring
   */
  private setupDatabaseListeners(): void {
    mongoose.connection.on('connected', () => {
      this.dbMetrics.connectionCount++;
    });

    mongoose.connection.on('disconnected', () => {
      this.dbMetrics.connectionCount = Math.max(0, this.dbMetrics.connectionCount - 1);
    });

    mongoose.connection.on('error', () => {
      this.dbMetrics.errors++;
    });
  }

  /**
   * Record a request for monitoring
   * @param req Express request
   * @param res Express response
   * @param responseTime Response time in ms
   */
  recordRequest(req: express.Request, res: express.Response, responseTime: number): void {
    const metric: RequestMetrics = {
      timestamp: Date.now(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    this.requestMetrics.push(metric);

    // Track slow queries
    if (responseTime > this.slowQueryThreshold) {
      this.dbMetrics.slowQueries++;
    }

    // Keep only last 1000 requests to prevent memory issues
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics.shift();
    }
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    this.cacheMetrics.hitRate = total > 0 ? (this.cacheMetrics.hits / total) * 100 : 0;
  }

  /**
   * Update cache key count
   * @param count Number of keys in cache
   */
  updateCacheKeys(count: number): void {
    this.cacheMetrics.keys = count;
  }

  /**
   * Get request metrics
   */
  getRequestMetrics(): RequestMetrics[] {
    return this.requestMetrics;
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    return {
      ...this.dbMetrics,
      connectionCount: mongoose.connections.length
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    };
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Get error rate
   */
  getErrorRate(): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const errorRequests = this.requestMetrics.filter(r => r.statusCode >= 500).length;
    return (errorRequests / this.requestMetrics.length) * 100;
  }

  /**
   * Get average response time
   */
  getAvgResponseTime(): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const totalResponseTime = this.requestMetrics.reduce((sum, r) => sum + r.responseTime, 0);
    return totalResponseTime / this.requestMetrics.length;
  }

  /**
   * Get requests per second
   */
  getRequestsPerSecond(): number {
    if (this.requestMetrics.length === 0) return 0;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minute ago
    const recentRequests = this.requestMetrics.filter(r => r.timestamp > oneMinuteAgo);
    
    return recentRequests.length / 60; // requests per second
  }

  /**
   * Get top slow endpoints
   * @param limit Number of endpoints to return
   */
  getTopSlowEndpoints(limit: number = 10): RequestMetrics[] {
    return [...this.requestMetrics]
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }

  /**
   * Get status code distribution
   */
  getStatusCodeDistribution(): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    this.requestMetrics.forEach(metric => {
      if (!distribution[metric.statusCode]) {
        distribution[metric.statusCode] = 0;
      }
      distribution[metric.statusCode]++;
    });
    
    return distribution;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestMetrics = [];
    this.dbMetrics.slowQueries = 0;
    this.dbMetrics.errors = 0;
    this.cacheMetrics.hits = 0;
    this.cacheMetrics.misses = 0;
    this.cacheMetrics.hitRate = 0;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
  } {
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAvgResponseTime();
    
    if (errorRate > 5 || avgResponseTime > 2000) {
      return {
        status: 'unhealthy',
        message: 'High error rate or slow response times detected'
      };
    } else if (errorRate > 2 || avgResponseTime > 1000) {
      return {
        status: 'degraded',
        message: 'Moderate error rate or response times'
      };
    } else {
      return {
        status: 'healthy',
        message: 'System is operating normally'
      };
    }
  }

  /**
   * Get comprehensive metrics report
   */
  getMetricsReport(): any {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: this.requestMetrics.length,
        perSecond: this.getRequestsPerSecond(),
        avgResponseTime: this.getAvgResponseTime(),
        errorRate: this.getErrorRate(),
        statusCodes: this.getStatusCodeDistribution()
      },
      database: this.getDatabaseMetrics(),
      cache: this.getCacheMetrics(),
      system: this.getSystemMetrics(),
      health: this.getHealthStatus()
    };
  }
}

export default MonitoringService;