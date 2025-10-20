import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { StadiumController } from '../controllers/stadium.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { uploadStadiumImages } from '../middleware/upload';
import Stadium from '../models/Stadium';
import User from '../models/User';
import multer from 'multer';


const router = Router();

/**
 * @swagger
 * /api/stadiums:
 *   get:
 *     summary: Get all stadiums (public)
 *     tags: [Stadiums]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
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
 *           maximum: 50
 *         description: Items per page
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometers
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, createdAt, capacity, averageRating]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (asc or desc)
 *     responses:
 *       200:
 *         description: List of stadiums
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
 *                     pages:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to get stadiums
 */
router.get(
  '/',
  [
    query('city').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('lat').optional().isFloat(),
    query('lng').optional().isFloat(),
    query('radius').optional().isFloat(),
    query('sort')
      .optional()
      .isIn(['name', 'createdAt', 'capacity', 'averageRating'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be "asc" or "desc"'),
  ],
  StadiumController.getAllStadiums
);


/**
 * @swagger
 * /api/stadiums/my-stadiums:
 *   get:
 *     summary: Get stadiums owned by current user (stadium owners only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's stadiums
 */
router.get('/my-stadiums', [
  authenticateToken,
  authorizeRoles(['stadium_owner', 'superadmin'])
], StadiumController.getMyStadiums);
/**
 * @swagger
 * /api/stadiums:
 *   post:
 *     summary: Create a new stadium with optional owner assignment
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               assignedOwnerId:
 *                 type: string
 *                 description: ID of stadium owner to assign this stadium to (superadmin only)
 *               address:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               facilities:
 *                 type: string
 *               fields:
 *                 type: string
 *               status:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 */
router.post(
  '/',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
    uploadStadiumImages.fields([
      { name: 'images', maxCount: 5 },
      { name: 'bankQRCodeImage', maxCount: 1 }
    ]),
    body('name').trim().notEmpty().withMessage('Stadium name is required'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Address is required')
      .bail()
      .custom((value) => {
        try {
          const addr = JSON.parse(value);
          if (!addr.city) {
            throw new Error('City is required in address');
          }
          if (!addr.coordinates) {
            throw new Error('Coordinates are required in address');
          }
          if (!Array.isArray(addr.coordinates) || addr.coordinates.length !== 2) {
            throw new Error('Coordinates must be an array of [longitude, latitude]');
          }
          
          const [lng, lat] = addr.coordinates;
          if (lng < 100 || lng > 108 || lat < 13 || lat > 23) {
            throw new Error('Coordinates must be within Laos range: longitude 100-108, latitude 13-23');
          }
          
          return true;
        } catch (error: any) {
          throw new Error(`Invalid address: ${error.message}`);
        }
      }),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Determine the owner ID
      let ownerId;
      
      // If superadmin is assigning to a specific owner
      if (req.user?.role === 'superadmin' && req.body.assignedOwnerId) {
        // Validate that the assigned owner exists and is a stadium owner
        const assignedOwner = await User.findOne({
          _id: req.body.assignedOwnerId,
          role: 'stadium_owner'
        });
        
        if (!assignedOwner) {
          return res.status(400).json({
            success: false,
            message: 'Assigned owner not found or is not a stadium owner'
          });
        }
        
        ownerId = req.body.assignedOwnerId;
      } else {
        // Use the current user's ID
        ownerId = req.user?.userId;
      }

      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFiles = files?.images || [];
      const imagePaths = imageFiles.map(file => `/uploads/stadiums/${file.filename}`) || [];

      // Helper function to parse JSON fields
      const parseField = (fieldName: string, fieldValue: any, required = false): any => {
        if (!fieldValue) {
          if (required) {
            throw new Error(`${fieldName} is required`);
          }
          return fieldName === 'fields' ? [] : {};
        }
        
        if (typeof fieldValue !== 'string') {
          return fieldValue;
        }
        
        try {
          const parsed = JSON.parse(fieldValue);
          return parsed;
        } catch (e) {
          throw new Error(`Invalid JSON in ${fieldName}: ${(e as Error).message}`);
        }
      };

      try {
        const address = parseField('address', req.body.address, true);
        const facilities = parseField('facilities', req.body.facilities);
        const fields = parseField('fields', req.body.fields);

        // Validate required address fields
        if (!address.city) {
          return res.status(400).json({
            success: false,
            message: 'City is required in address',
          });
        }

        if (!address.coordinates || !Array.isArray(address.coordinates) || address.coordinates.length !== 2) {
          return res.status(400).json({
            success: false,
            message: 'Valid coordinates [longitude, latitude] are required in address',
          });
        }

        // Validate Laos coordinates range
        const [lng, lat] = address.coordinates;
        if (lng < 100 || lng > 108 || lat < 13 || lat > 23) {
          return res.status(400).json({
            success: false,
            message: 'Coordinates must be within Laos range: longitude 100-108, latitude 13-23',
          });
        }

        // Format the address for MongoDB geospatial indexing
        const formattedAddress = {
          ...address,
          coordinates: {
            type: 'Point',
            coordinates: address.coordinates
          }
        };

        const stadiumData = {
          ownerId,
          name: req.body.name,
          description: req.body.description,
          address: formattedAddress,
          capacity: parseInt(req.body.capacity, 10),
          facilities,
          fields,
          images: imagePaths,
          status: req.body.status || 'active',
          // Add bank account fields
          bankAccountName: req.body.bankAccountName,
          bankAccountNumber: req.body.bankAccountNumber,
          bankQRCodeImage: req.body.bankQRCodeImage || (files && files.bankQRCodeImage && files.bankQRCodeImage.length > 0 ? `/uploads/stadiums/${files.bankQRCodeImage[0].filename}` : undefined)
        };

        const stadium = new Stadium(stadiumData);
        await stadium.save();

        return res.status(201).json({
          success: true,
          message: 'Stadium created successfully',
          data: stadium,
        });

      } catch (parseError: any) {
        return res.status(400).json({
          success: false,
          message: parseError.message,
        });
      }

    } catch (error: any) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`,
        });
      }
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/staff:
 *   post:
 *     summary: Add staff/referee to stadium (owner/admin only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *               - rates.hourlyRate
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, referee, maintenance, security]
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     level:
 *                       type: string
 *                     issuedDate:
 *                       type: string
 *                     expiryDate:
 *                       type: string
 *                     certificateNumber:
 *                       type: string
 *               availability:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 6
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     isAvailable:
 *                       type: boolean
 *               rates:
 *                 type: object
 *                 required:
 *                   - hourlyRate
 *                 properties:
 *                   hourlyRate:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   overtime:
 *                     type: number
 *     responses:
 *       201:
 *         description: Staff member added successfully
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
 *                   $ref: '#/components/schemas/Stadium/properties/staff/items'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to add staff member
 */
router.post(
  '/:stadiumId/staff',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
    body('name').trim().isLength({ min: 1 }).withMessage('Staff name is required'),
    body('role').isIn(['manager', 'referee', 'maintenance', 'security']).withMessage('Invalid role'),
    body('rates.hourlyRate').isNumeric().withMessage('Hourly rate must be a number'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        return res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to manage this stadium',
        });
      }

      // Initialize staff array if undefined
      if (!Array.isArray(stadium.staff)) {
        stadium.staff = [];
      }

      const staffData = {
        ...req.body,
        rates: {
          ...req.body.rates,
          currency: 'LAK',
        },
      };

      stadium.staff.push(staffData);
      await stadium.save();

      // Return the last added staff member
      return res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        data: stadium.staff[stadium.staff.length - 1],
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/staff/{staffId}:
 *   put:
 *     summary: Update staff/referee in stadium (owner/admin only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *       - in: path
 *         name: staffId
 *         schema:
 *           type: string
 *         required: true
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, referee, maintenance, security]
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     level:
 *                       type: string
 *                     issuedDate:
 *                       type: string
 *                     expiryDate:
 *                       type: string
 *                     certificateNumber:
 *                       type: string
 *               availability:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 6
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     isAvailable:
 *                       type: boolean
 *               rates:
 *                 type: object
 *                 properties:
 *                   hourlyRate:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   overtime:
 *                     type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Staff member updated successfully
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
 *                   $ref: '#/components/schemas/Stadium/properties/staff/items'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Stadium or staff member not found
 *       500:
 *         description: Failed to update staff member
 */
router.put(
  '/:stadiumId/staff/:staffId',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
    body('name').optional().trim().isLength({ min: 1 }).withMessage('Staff name cannot be empty'),
    body('role').optional().isIn(['manager', 'referee', 'maintenance', 'security']).withMessage('Invalid role'),
    body('rates.hourlyRate').optional().isNumeric().withMessage('Hourly rate must be a number'),
    body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  ],
  StadiumController.updateStaff
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/staff/{staffId}:
 *   delete:
 *     summary: Delete staff/referee from stadium (owner/admin only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *       - in: path
 *         name: staffId
 *         schema:
 *           type: string
 *         required: true
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Stadium or staff member not found
 *       500:
 *         description: Failed to delete staff member
 */
router.delete(
  '/:stadiumId/staff/:staffId',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
  ],
  StadiumController.deleteStaff
);

/**
 * @swagger
 * /api/stadiums/{id}:
 *   get:
 *     summary: Get stadium details by ID (public)
 *     tags: [Stadiums]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *     responses:
 *       200:
 *         description: Stadium details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Stadium'
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to get stadium
 */
router.get(
  '/:id',
  StadiumController.getStadiumById
);


/**
 * @swagger
 * /api/stadiums/{id}:
 *   put:
 *     summary: Update stadium details (owner/admin only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Stadium Name
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *                 example: '{"city": "Pakse", "coordinates": [101.2, 15.9]}'
 *                 description: Address as JSON string with city and coordinates
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *               facilities:
 *                 type: string
 *                 example: '{"parking": true, "changingRooms": 3}'
 *                 description: Facilities as JSON string
 *               fields:
 *                 type: string
 *                 example: '[{"name": "Main Field", "fieldType": "11v11", "pricing": {"baseHourlyRate": 500000}}]'
 *                 description: Fields as JSON string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload new images (up to 5 total)
 *               removeImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs to remove from existing images
 *     responses:
 *       200:
 *         description: Stadium updated successfully
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
 *                   $ref: '#/components/schemas/Stadium'
 *       400:
 *         description: Validation or parse error
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
    uploadStadiumImages.fields([
      { name: 'images', maxCount: 5 },
      { name: 'bankQRCodeImage', maxCount: 1 }
    ]),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('address')
      .optional()
      .trim()
      .notEmpty()
      .bail()
      .custom((value) => {
        try {
          const addr = JSON.parse(value);
          if (!addr.city) throw new Error('City is required');
          if (!addr.coordinates) throw new Error('Coordinates are required');
          if (!Array.isArray(addr.coordinates) || addr.coordinates.length !== 2) {
            throw new Error('Coordinates must be [longitude, latitude]');
          }
          const [lng, lat] = addr.coordinates;
          if (lng < 100 || lng > 108 || lat < 13 || lat > 23) {
            throw new Error('Coordinates must be within Laos (100-108°E, 13-23°N)');
          }
          return true;
        } catch (e: any) {
          throw new Error(`Invalid address JSON: ${e.message}`);
        }
      }),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;

      const stadium = await Stadium.findById(id);
      if (!stadium) {
        return res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
      }

      // Authorization check
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this stadium',
        });
      }

      // Parse JSON fields
      const parseField = (fieldName: string, value: any): any => {
        if (!value) return undefined;
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          throw new Error(`Invalid JSON in ${fieldName}`);
        }
      };

      // Handle address
      let updatedAddress = stadium.address;
      if (req.body.address) {
        const parsedAddress = parseField('address', req.body.address);
        if (!parsedAddress.city) {
          return res.status(400).json({ success: false, message: 'City is required' });
        }
        if (!parsedAddress.coordinates || parsedAddress.coordinates.length !== 2) {
          return res.status(400).json({ success: false, message: 'Valid coordinates required' });
        }

        updatedAddress = {
          ...parsedAddress,
          coordinates: {
            type: 'Point',
            coordinates: parsedAddress.coordinates,
          },
        };
      }

      // Handle images
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFiles = files?.images || [];
      const newImagePaths = imageFiles.map(file => `/uploads/stadiums/${file.filename}`) || [];
      const existingImages = stadium.images || [];

      // Handle removed images
      const removeImages: string[] = req.body.removeImages
        ? Array.isArray(req.body.removeImages)
          ? req.body.removeImages
          : [req.body.removeImages]
        : [];

      const filteredImages = existingImages.filter(img => !removeImages.includes(img));
      const finalImages = [...filteredImages, ...newImagePaths];

      if (finalImages.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed',
        });
      }

      // Update stadium fields
      stadium.name = req.body.name || stadium.name;
      stadium.description = req.body.description ?? stadium.description;
      stadium.address = updatedAddress;
      stadium.capacity = req.body.capacity ? parseInt(req.body.capacity, 10) : stadium.capacity;
      stadium.facilities = req.body.facilities ? parseField('facilities', req.body.facilities) : stadium.facilities;
      stadium.fields = req.body.fields ? parseField('fields', req.body.fields) : stadium.fields;
      stadium.status = req.body.status || stadium.status;
      stadium.images = finalImages;
      // Update bank account fields if provided
      if (req.body.bankAccountName !== undefined) {
        stadium.bankAccountName = req.body.bankAccountName;
      }
      if (req.body.bankAccountNumber !== undefined) {
        stadium.bankAccountNumber = req.body.bankAccountNumber;
      }
      // Handle bank QR code image upload
      if (files && files.bankQRCodeImage && files.bankQRCodeImage.length > 0) {
        stadium.bankQRCodeImage = `/uploads/stadiums/${files.bankQRCodeImage[0].filename}`;
      }

      // Update stats if needed
      stadium.stats = {
        ...(stadium.stats || {}),
        lastUpdated: new Date(),
      };

      await stadium.save();

      return res.json({
        success: true,
        message: 'Stadium updated successfully',
        data: stadium,
      });
    } catch (error: any) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`,
        });
      }
      return next(error);
    }
  }
);


/**
 * @swagger
 * /api/stadiums/{id}:
 *   delete:
 *     summary: Delete a stadium by setting status to inactive (owner/admin only)
 *     tags: [Stadiums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *     responses:
 *       200:
 *         description: Stadium deleted successfully (soft delete)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized to delete this stadium
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to delete stadium
 */
router.delete(
  '/:id',
  [
    authenticateToken,
    authorizeRoles(['stadium_owner', 'superadmin']),
  ],
  StadiumController.deleteStadium
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/availability:
 *   get:
 *     summary: Get comprehensive availability information for all fields in a stadium on a specific date
 *     tags: [Stadiums]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Stadium availability information for all fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stadium:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         address:
 *                           type: object
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           availableSlots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 rate:
 *                                   type: number
 *                                 currency:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                   example: available
 *                           unavailableSlots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                 endTime:
 *                                   type: string
 *                                 rate:
 *                                   type: number
 *                                 currency:
 *                                   type: string
 *                                 reason:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                   enum: [schedule_unavailable, booked]
 *                                 bookingStatus:
 *                                   type: string
 *                                   enum: [pending, confirmed]
 *                           summary:
 *                             type: object
 *                             properties:
 *                               totalSlots:
 *                                 type: number
 *                               availableCount:
 *                                 type: number
 *                               unavailableCount:
 *                                 type: number
 *                     availableReferees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           specializations:
 *                             type: array
 *                             items:
 *                               type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *       400:
 *         description: Invalid date format or past date
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to get availability
 */
router.get(
  '/:stadiumId/availability',
  [
    query('date')
      .notEmpty()
      .withMessage('Date is required')
      .custom((value) => {
        const moment = require('moment');
        const date = moment(value, 'YYYY-MM-DD', true);
        if (!date.isValid()) {
          throw new Error('Invalid date format. Please use YYYY-MM-DD');
        }
        if (date.isBefore(moment().startOf('day'))) {
          throw new Error('Cannot check availability for past dates');
        }
        return true;
      })
  ],
  StadiumController.getStadiumAvailability
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/check-slot:
 *   get:
 *     summary: Check availability of a specific time slot across all fields in a stadium
 *     tags: [Stadiums]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD)
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: Start time (HH:mm)
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: End time (HH:mm)
 *     responses:
 *       200:
 *         description: Slot availability check result for all fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stadium:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           isAvailable:
 *                             type: boolean
 *                           reason:
 *                             type: string
 *                           pricing:
 *                             type: object
 *                             properties:
 *                               rate:
 *                                 type: number
 *                               duration:
 *                                 type: number
 *                               total:
 *                                 type: number
 *                               currency:
 *                                 type: string
 *                     availableReferees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Stadium not found
 */
router.get(
  '/:stadiumId/check-slot',
  [
    query('date').notEmpty().isISO8601(),
    query('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    query('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  ],
  StadiumController.checkStadiumSlot
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/fields/{fieldId}/availability:
 *   get:
 *     summary: Get comprehensive availability information for a specific field in a stadium on a specific date
 *     tags: [Stadiums]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Field availability information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     dayOfWeek:
 *                       type: number
 *                       description: Day of week (0=Sunday, 6=Saturday)
 *                     fieldInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                         surface:
 *                           type: string
 *                         status:
 *                           type: string
 *                         baseRate:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     stadiumInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     availableSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           status:
 *                             type: string
 *                             example: available
 *                     unavailableSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [schedule_unavailable, booked]
 *                           bookingStatus:
 *                             type: string
 *                             enum: [pending, confirmed]
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSlots:
 *                           type: number
 *                         availableCount:
 *                           type: number
 *                         unavailableCount:
 *                           type: number
 *                     availableReferees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           specializations:
 *                             type: array
 *                             items:
 *                               type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                     specialDateInfo:
 *                       type: object
 *                       properties:
 *                         isSpecialDate:
 *                           type: boolean
 *                         reason:
 *                           type: string
 *       400:
 *         description: Invalid date format or past date
 *       404:
 *         description: Stadium or field not found
 *       500:
 *         description: Failed to get availability
 */
router.get(
  '/:stadiumId/fields/:fieldId/availability',
  [
    query('date')
      .notEmpty()
      .withMessage('Date is required')
      .custom((value) => {
        const moment = require('moment');
        const date = moment(value, 'YYYY-MM-DD', true);
        if (!date.isValid()) {
          throw new Error('Invalid date format. Please use YYYY-MM-DD');
        }
        if (date.isBefore(moment().startOf('day'))) {
          throw new Error('Cannot check availability for past dates');
        }
        return true;
      })
  ],
  StadiumController.getFieldAvailability
);

/**
 * @swagger
 * /api/stadiums/{stadiumId}/fields/{fieldId}/check-slot:
 *   get:
 *     summary: Check availability of a specific time slot for a specific field in a stadium
 *     tags: [Stadiums]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD)
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: Start time (HH:mm)
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: End time (HH:mm)
 *     responses:
 *       200:
 *         description: Slot availability check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isAvailable:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         rate:
 *                           type: number
 *                         duration:
 *                           type: number
 *                         total:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     availableReferees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Stadium or field not found
 */
router.get(
  '/:stadiumId/fields/:fieldId/check-slot',
  [
    query('date').notEmpty().isISO8601(),
    query('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    query('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  ],
  StadiumController.checkFieldSlot
);

/**
 * @swagger
 * /api/stadiums/nearby:
 *   get:
 *     summary: Get nearby stadiums based on location
 *     tags: [Stadiums]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometers (default 10km)
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
 *           maximum: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of nearby stadiums
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
 *                     pages:
 *                       type: number
 *                 location:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     radius:
 *                       type: number
 *       400:
 *         description: Validation error or missing coordinates
 *       500:
 *         description: Failed to get stadiums
 */
router.get(
  '/nearby',
  [
    query('lat').exists().withMessage('Latitude is required').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('lng').exists().withMessage('Longitude is required').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  StadiumController.getNearbyStadiums
);

export default router;