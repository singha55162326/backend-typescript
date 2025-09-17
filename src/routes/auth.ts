import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { requireAdmin, requireStadiumOwnerOrAdmin } from '../middleware/rbac';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 })
], AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], AuthController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user data
 *     tags: [Authentication]
 */
router.get('/me', authenticateToken, AuthController.getMe);


/**
 * @swagger
 * /api/auth/stadium-owners:
 *   get:
 *     summary: Get all stadium owners for assignment
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stadium owners
 */
router.get(
  '/stadium-owners',
  authenticateToken,
  authorizeRoles(['superadmin']),
  AuthController.getStadiumOwners
);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Manage users (admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', 
  authenticateToken, 
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  AuthController.getAllUsers
);

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     summary: Update user status (e.g., active, suspended)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/users/:id/status',
  authenticateToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('status').isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status'),
  ],
  AuthController.updateUserStatus
);

/**
 * @swagger
 * /api/users/{id}/verify:
 *   put:
 *     summary: Verify a user (e.g., mark as verified)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User verified
 */
router.put('/users/:id/verify',
  authenticateToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  AuthController.verifyUser
);


/**
 * @swagger
 * /api/auth/users:
 *   post:
 *     summary: Create a new user (admin/stadium_owner only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [general_user, stadium_owner]
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post(
  '/users',
  authenticateToken,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone('any').trim(),
    body('role').optional().isIn(['general_user', 'stadium_owner']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'suspended', 'inactive']),
  ],
  AuthController.createUser
);



/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 */
router.get(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  AuthController.getUserById
);



/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user profile (partial update)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [general_user, stadium_owner]
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone('any').trim(),
    body('role').optional().isIn(['general_user', 'stadium_owner']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Invalid status'),
  ],
  AuthController.updateUser
);


/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Fully update user profile (replace entire user data)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [general_user, stadium_owner]
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Optional; if provided, updates password
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation errors
 *       404:
 *         description: User not found
 */
router.put(
  '/users/:id',
  authenticateToken,
  requireStadiumOwnerOrAdmin,
  AuthController.replaceUser
);


/**
 * @swagger
 * /api/auth/customer/login:
 *   post:
 *     summary: Login user with LAO phone number (must be Lao format)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "02012345678"
 *                 description: Must be Lao phone number (020..., +85620..., or 20...)
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid Lao phone number
 *       401:
 *         description: Invalid credentials or inactive account
 */

// Login customer with phone number
router.post('/customer/login', [
body('phone')
  .isLength({ min: 8, max: 15 })
  .withMessage('Phone must be 8–15 characters (digits, spaces, or + allowed)'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
], AuthController.phoneLogin);

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               profile:
 *                 type: object
 *                 properties:
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *                     enum: [male, female, other, prefer_not_to_say]
 *                   bio:
 *                     type: string
 *                   preferredLanguage:
 *                     type: string
 *                   timezone:
 *                     type: string
 *                   notificationPreferences:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                       sms:
 *                         type: boolean
 *                       push:
 *                         type: boolean
 *                       bookingReminders:
 *                         type: boolean
 *                       promotions:
 *                         type: boolean
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/me', authenticateToken, AuthController.updateUserProfile);

export default router;
