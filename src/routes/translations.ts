import { Router } from 'express';
import { TranslationController } from '../controllers/translation.controller';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// Public routes
router.get('/languages', TranslationController.getSupportedLanguages);
router.get('/namespaces', TranslationController.getAvailableNamespaces);
router.get('/statistics', TranslationController.getTranslationStatistics);

// Admin routes for translation management
router.get('/missing', 
  authenticateToken, 
  requireAdmin,
  TranslationController.getMissingTranslations
);

// Get translations for a specific language and namespace
router.get('/:language/:namespace', 
  authenticateToken, 
  requireAdmin,
  TranslationController.getTranslations
);

// Get translations for a specific language (all namespaces)
router.get('/:language', 
  authenticateToken, 
  requireAdmin,
  TranslationController.getTranslations
);

export default router;