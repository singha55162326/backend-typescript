import { Router } from 'express';
import MonitoringService from '../services/monitoring.service';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();
const monitoringService = MonitoringService.getInstance();

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: System monitoring and metrics
 */

/**
 * @swagger
 * /api/monitoring/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 requests:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     perSecond:
 *                       type: number
 *                     avgResponseTime:
 *                       type: number
 *                     errorRate:
 *                       type: number
 *                     statusCodes:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                 database:
 *                   type: object
 *                   properties:
 *                     connectionCount:
 *                       type: number
 *                     avgQueryTime:
 *                       type: number
 *                     slowQueries:
 *                       type: number
 *                     errors:
 *                       type: number
 *                 cache:
 *                   type: object
 *                   properties:
 *                     hits:
 *                       type: number
 *                     misses:
 *                       type: number
 *                     hitRate:
 *                       type: number
 *                     keys:
 *                       type: number
 *                 system:
 *                   type: object
 *                   properties:
 *                     cpuUsage:
 *                       type: object
 *                     memoryUsage:
 *                       type: object
 *                     uptime:
 *                       type: number
 *                     loadAverage:
 *                       type: array
 *                       items:
 *                         type: number
 *                 health:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/metrics', authenticateToken, authorizeRoles(['superadmin']), (_req, res) => {
  res.json(monitoringService.getMetricsReport());
});

/**
 * @swagger
 * /api/monitoring/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req, res) => {
  const healthStatus = monitoringService.getHealthStatus();
  res.json({
    ...healthStatus,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/monitoring/top-slow-endpoints:
 *   get:
 *     summary: Get top slow endpoints
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of endpoints to return
 *     responses:
 *       200:
 *         description: Top slow endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp:
 *                     type: number
 *                   method:
 *                     type: string
 *                   url:
 *                     type: string
 *                   statusCode:
 *                     type: number
 *                   responseTime:
 *                     type: number
 *                   userAgent:
 *                     type: string
 *                   ip:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/top-slow-endpoints', authenticateToken, authorizeRoles(['superadmin']), (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const slowEndpoints = monitoringService.getTopSlowEndpoints(limit);
  res.json(slowEndpoints);
});

/**
 * @swagger
 * /api/monitoring/reset:
 *   post:
 *     summary: Reset monitoring metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/reset', authenticateToken, authorizeRoles(['superadmin']), (_req, res) => {
  monitoringService.resetMetrics();
  res.json({
    success: true,
    message: 'Metrics reset successfully'
  });
});

export default router;