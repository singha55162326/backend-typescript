import { Router } from 'express';
import { query } from 'express-validator';
import { StadiumSearchController } from '../controllers/stadium-search.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Stadium Search
 *   description: Advanced stadium search and filtering endpoints
 */

/**
 * @swagger
 * /api/stadiums/search:
 *   get:
 *     summary: Advanced stadium search with multiple filters
 *     tags: [Stadium Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Text search query (searches in name, description, city, etc.)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City filter
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country filter
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: integer
 *         description: Maximum distance in meters for location-based search
 *       - in: query
 *         name: fieldType
 *         schema:
 *           type: string
 *         description: Field type filter (11v11, 7v7, 5v5, futsal, training)
 *       - in: query
 *         name: surfaceType
 *         schema:
 *           type: string
 *         description: Surface type filter (natural_grass, artificial_grass, indoor)
 *       - in: query
 *         name: minCapacity
 *         schema:
 *           type: integer
 *         description: Minimum capacity filter
 *       - in: query
 *         name: maxCapacity
 *         schema:
 *           type: integer
 *         description: Maximum capacity filter
 *       - in: query
 *         name: hasParking
 *         schema:
 *           type: boolean
 *         description: Parking facility filter
 *       - in: query
 *         name: hasChangingRooms
 *         schema:
 *           type: boolean
 *         description: Changing rooms facility filter
 *       - in: query
 *         name: hasLighting
 *         schema:
 *           type: boolean
 *         description: Lighting facility filter
 *       - in: query
 *         name: hasSeating
 *         schema:
 *           type: boolean
 *         description: Seating facility filter
 *       - in: query
 *         name: hasRefreshments
 *         schema:
 *           type: boolean
 *         description: Refreshments facility filter
 *       - in: query
 *         name: hasFirstAid
 *         schema:
 *           type: boolean
 *         description: First aid facility filter
 *       - in: query
 *         name: hasSecurity
 *         schema:
 *           type: boolean
 *         description: Security facility filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per hour filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Currency for price filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Stadium status filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Stadiums retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stadium'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve stadiums
 */
router.get('/search', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('longitude').optional().isFloat(),
  query('latitude').optional().isFloat(),
  query('maxDistance').optional().isInt(),
  query('minCapacity').optional().isInt(),
  query('maxCapacity').optional().isInt(),
  query('maxPrice').optional().isFloat(),
  query('hasParking').optional().isBoolean(),
  query('hasChangingRooms').optional().isBoolean(),
  query('hasLighting').optional().isBoolean(),
  query('hasSeating').optional().isBoolean(),
  query('hasRefreshments').optional().isBoolean(),
  query('hasFirstAid').optional().isBoolean(),
  query('hasSecurity').optional().isBoolean()
], StadiumSearchController.searchStadiums);

/**
 * @swagger
 * /api/stadiums/search/facilities:
 *   get:
 *     summary: Search stadiums by facilities
 *     tags: [Stadium Search]
 *     parameters:
 *       - in: query
 *         name: hasParking
 *         schema:
 *           type: boolean
 *         description: Parking facility filter
 *       - in: query
 *         name: hasChangingRooms
 *         schema:
 *           type: boolean
 *         description: Changing rooms facility filter
 *       - in: query
 *         name: hasLighting
 *         schema:
 *           type: boolean
 *         description: Lighting facility filter
 *       - in: query
 *         name: hasSeating
 *         schema:
 *           type: boolean
 *         description: Seating facility filter
 *       - in: query
 *         name: hasRefreshments
 *         schema:
 *           type: boolean
 *         description: Refreshments facility filter
 *       - in: query
 *         name: hasFirstAid
 *         schema:
 *           type: boolean
 *         description: First aid facility filter
 *       - in: query
 *         name: hasSecurity
 *         schema:
 *           type: boolean
 *         description: Security facility filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Stadiums retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stadium'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve stadiums
 */
router.get('/search/facilities', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('hasParking').optional().isBoolean(),
  query('hasChangingRooms').optional().isBoolean(),
  query('hasLighting').optional().isBoolean(),
  query('hasSeating').optional().isBoolean(),
  query('hasRefreshments').optional().isBoolean(),
  query('hasFirstAid').optional().isBoolean(),
  query('hasSecurity').optional().isBoolean()
], StadiumSearchController.searchByFacilities);

/**
 * @swagger
 * /api/stadiums/search/price:
 *   get:
 *     summary: Search stadiums by price range
 *     tags: [Stadium Search]
 *     parameters:
 *       - in: query
 *         name: maxPrice
 *         required: true
 *         schema:
 *           type: number
 *         description: Maximum price per hour
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Currency code (default LAK)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Stadiums retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stadium'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve stadiums
 */
router.get('/search/price', [
  query('maxPrice').exists().isFloat({ min: 0.01 }),
  query('currency').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], StadiumSearchController.searchByPrice);

/**
 * @swagger
 * /api/stadiums/search/default:
 *   get:
 *     summary: Search stadiums with user's default saved search preferences
 *     tags: [Stadium Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Stadiums retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stadium'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve stadiums
 */
router.get('/search/default', 
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ], 
  StadiumSearchController.searchWithDefaultPreferences
);

export default router;