import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { TranslationService } from '../../services/translation.service';

interface TranslationUpdate {
  key: string;
  value: string;
}

export class TranslationManagementController {
  /**
   * Update translations for a specific language and namespace
   */
  static async updateTranslations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, namespace } = req.params;
      const { translations }: { translations: TranslationUpdate[] } = req.body;
      
      // Validate language
      const supportedLanguages = TranslationService.getSupportedLanguages();
      if (!supportedLanguages.includes(language)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported language' }]
        });
        return;
      }
      
      // Validate namespace
      const supportedNamespaces = ['common', 'booking', 'analytics', 'reviews', 'loyalty'];
      if (!supportedNamespaces.includes(namespace)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported namespace' }]
        });
        return;
      }
      
      // Validate translations array
      if (!Array.isArray(translations)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Translations must be an array' }]
        });
        return;
      }
      
      // Validate each translation entry
      for (const translation of translations) {
        if (!translation.key || typeof translation.key !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Error',
            errors: [{ msg: 'Each translation must have a valid key' }]
          });
          return;
        }
        if (typeof translation.value !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Error',
            errors: [{ msg: 'Each translation must have a valid value' }]
          });
          return;
        }
      }
      
      // Read the current translation file
      const filePath = path.join(__dirname, `../../locales/${language}/${namespace}/${namespace}.json`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Translation file not found'
        });
        return;
      }
      
      // Read current translations
      const currentTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Update translations
      const updatedTranslations = { ...currentTranslations };
      for (const translation of translations) {
        updatedTranslations[translation.key] = translation.value;
      }
      
      // Write updated translations back to file
      fs.writeFileSync(filePath, JSON.stringify(updatedTranslations, null, 2), 'utf8');
      
      res.json({
        success: true,
        message: 'Translations updated successfully',
        data: { 
          language,
          namespace,
          updatedCount: translations.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add new translation keys
   */
  static async addTranslationKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, namespace } = req.params;
      const { translations }: { translations: TranslationUpdate[] } = req.body;
      
      // Validate language
      const supportedLanguages = TranslationService.getSupportedLanguages();
      if (!supportedLanguages.includes(language)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported language' }]
        });
        return;
      }
      
      // Validate namespace
      const supportedNamespaces = ['common', 'booking', 'analytics', 'reviews', 'loyalty'];
      if (!supportedNamespaces.includes(namespace)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported namespace' }]
        });
        return;
      }
      
      // Validate translations array
      if (!Array.isArray(translations)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Translations must be an array' }]
        });
        return;
      }
      
      // Validate each translation entry
      for (const translation of translations) {
        if (!translation.key || typeof translation.key !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Error',
            errors: [{ msg: 'Each translation must have a valid key' }]
          });
          return;
        }
        if (typeof translation.value !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Error',
            errors: [{ msg: 'Each translation must have a valid value' }]
          });
          return;
        }
      }
      
      // Read the current translation file
      const filePath = path.join(__dirname, `../../locales/${language}/${namespace}/${namespace}.json`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Translation file not found'
        });
        return;
      }
      
      // Read current translations
      const currentTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Add new translations (don't overwrite existing ones)
      const updatedTranslations = { ...currentTranslations };
      let addedCount = 0;
      
      for (const translation of translations) {
        if (!updatedTranslations.hasOwnProperty(translation.key)) {
          updatedTranslations[translation.key] = translation.value;
          addedCount++;
        }
      }
      
      // Write updated translations back to file
      fs.writeFileSync(filePath, JSON.stringify(updatedTranslations, null, 2), 'utf8');
      
      res.json({
        success: true,
        message: 'Translation keys added successfully',
        data: { 
          language,
          namespace,
          addedCount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete translation keys
   */
  static async deleteTranslationKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { language, namespace } = req.params;
      const { keys }: { keys: string[] } = req.body;
      
      // Validate language
      const supportedLanguages = TranslationService.getSupportedLanguages();
      if (!supportedLanguages.includes(language)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported language' }]
        });
        return;
      }
      
      // Validate namespace
      const supportedNamespaces = ['common', 'booking', 'analytics', 'reviews', 'loyalty'];
      if (!supportedNamespaces.includes(namespace)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Unsupported namespace' }]
        });
        return;
      }
      
      // Validate keys array
      if (!Array.isArray(keys)) {
        res.status(400).json({
          success: false,
          message: 'Error',
          errors: [{ msg: 'Keys must be an array' }]
        });
        return;
      }
      
      // Validate each key
      for (const key of keys) {
        if (!key || typeof key !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Error',
            errors: [{ msg: 'Each key must be a valid string' }]
          });
          return;
        }
      }
      
      // Read the current translation file
      const filePath = path.join(__dirname, `../../locales/${language}/${namespace}/${namespace}.json`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Translation file not found'
        });
        return;
      }
      
      // Read current translations
      const currentTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Delete specified keys
      const updatedTranslations = { ...currentTranslations };
      let deletedCount = 0;
      
      for (const key of keys) {
        if (updatedTranslations.hasOwnProperty(key)) {
          delete updatedTranslations[key];
          deletedCount++;
        }
      }
      
      // Write updated translations back to file
      fs.writeFileSync(filePath, JSON.stringify(updatedTranslations, null, 2), 'utf8');
      
      res.json({
        success: true,
        message: 'Translation keys deleted successfully',
        data: { 
          language,
          namespace,
          deletedCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
}