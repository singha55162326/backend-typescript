import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { SavedSearchController } from '../controllers/saved-search.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/saved-searches:
 *   post:
 *     summary: Create a new saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - filters
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Football fields in Vientiane"
 *               filters:
 *                 type: object
 *                 description: Search filters object
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default search
 *     responses:
 *       201:
 *         description: Saved search created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',
  body('name').notEmpty().trim(),
  body('filters').isObject(),
  SavedSearchController.createSavedSearch
);

/**
 * @swagger
 * /api/saved-searches:
 *   get:
 *     summary: Get all saved searches for the current user
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved searches retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', SavedSearchController.getUserSavedSearches);

/**
 * @swagger
 * /api/saved-searches/default:
 *   get:
 *     summary: Get the default saved search for the current user
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default saved search retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No default saved search found
 */
router.get('/default', SavedSearchController.getUserDefaultSearch);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   get:
 *     summary: Get a specific saved search by ID
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     responses:
 *       200:
 *         description: Saved search retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.get('/:id',
  param('id').isMongoId(),
  SavedSearchController.getSavedSearchById
);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   put:
 *     summary: Update a saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               filters:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Saved search updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.put('/:id',
  param('id').isMongoId(),
  body('name').optional().trim(),
  body('filters').optional().isObject(),
  SavedSearchController.updateSavedSearch
);

/**
 * @swagger
 * /api/saved-searches/{id}:
 *   delete:
 *     summary: Delete a saved search
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     responses:
 *       200:
 *         description: Saved search deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.delete('/:id',
  param('id').isMongoId(),
  SavedSearchController.deleteSavedSearch
);

/**
 * @swagger
 * /api/saved-searches/{id}/apply:
 *   get:
 *     summary: Apply a saved search to get stadiums
 *     tags: [Saved Searches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     responses:
 *       200:
 *         description: Saved search filters retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.get('/:id/apply',
  param('id').isMongoId(),
  SavedSearchController.applySavedSearch
);

export default router;