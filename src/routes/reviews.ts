import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ReviewController } from '../controllers';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Stadium review and rating management
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review for a stadium
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stadiumId
 *               - bookingId
 *               - rating
 *               - title
 *               - comment
 *             properties:
 *               stadiumId:
 *                 type: string
 *               bookingId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Review created successfully
 */
router.post('/',
  authenticateToken,
  [
    body('stadiumId').isMongoId().withMessage('Invalid stadium ID'),
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
    body('comment').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment is required and must be less than 1000 characters')
  ],
  ReviewController.createReview
);

/**
 * @swagger
 * /api/reviews/stadium/{stadiumId}:
 *   get:
 *     summary: Get reviews for a stadium
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: approved
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/stadium/:stadiumId',
  [
    param('stadiumId').isMongoId().withMessage('Invalid stadium ID'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'approved', 'rejected'])
  ],
  ReviewController.getStadiumReviews
);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get current user's reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User reviews retrieved successfully
 */
router.get('/my-reviews',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  ReviewController.getUserReviews
);

/**
 * @swagger
 * /api/reviews/{reviewId}/moderate:
 *   put:
 *     summary: Moderate a review (admin/stadium owner only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review moderated successfully
 */
router.put('/:reviewId/moderate',
  authenticateToken,
  authorizeRoles(['superadmin', 'stadium_owner']),
  [
    param('reviewId').isMongoId().withMessage('Invalid review ID'),
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
  ],
  ReviewController.moderateReview
);

/**
 * @swagger
 * /api/reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark a review as helpful
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review marked as helpful
 */
router.post('/:reviewId/helpful',
  authenticateToken,
  [
    param('reviewId').isMongoId().withMessage('Invalid review ID')
  ],
  ReviewController.markHelpful
);

/**
 * @swagger
 * /api/reviews/{reviewId}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Review reported successfully
 */
router.post('/:reviewId/report',
  authenticateToken,
  [
    param('reviewId').isMongoId().withMessage('Invalid review ID'),
    body('reason').trim().isLength({ min: 1, max: 200 }).withMessage('Reason is required and must be less than 200 characters')
  ],
  ReviewController.reportReview
);

export default router;