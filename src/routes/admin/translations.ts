import { Router } from 'express';
import { TranslationManagementController } from '../../controllers/admin/translation-management.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';

const router = Router();

// All routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin);

// Update translations for a specific language and namespace
router.put('/:language/:namespace', TranslationManagementController.updateTranslations);

// Add new translation keys
router.post('/:language/:namespace/add', TranslationManagementController.addTranslationKeys);

// Delete translation keys
router.delete('/:language/:namespace/delete', TranslationManagementController.deleteTranslationKeys);

export default router;