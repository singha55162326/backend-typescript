import { Request, Response, NextFunction } from 'express';
import { LanguageManagementService } from '../services/language-management.service';
import { TranslationService } from '../services/translation.service';

export class TranslationController {
  /**
   * Get supported languages
   */
  static async getSupportedLanguages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const languages = LanguageManagementService.getSupportedLanguages();
      
      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: { languages }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available namespaces
   */
  static async getAvailableNamespaces(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const namespaces = LanguageManagementService.getAvailableNamespaces();
      
      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: { namespaces }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get translations for a specific language and namespace
   */
 /**
 * Get translations for a specific language and namespace
 */
static async getTranslations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { language, namespace } = req.params;
    
    // Validate language
    const supportedLanguages = TranslationService.getSupportedLanguages();
    if (!supportedLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        message: TranslationService.t('error'),
        errors: [{ msg: 'Unsupported language' }]
      });
      return;
    }
    
    // Validate namespace (optional, defaults to 'common')
    const namespaces = LanguageManagementService.getAvailableNamespaces();
    const ns = namespace || 'common';
    
    // Validate that namespace exists
    if (!namespaces.includes(ns)) {
      res.status(400).json({
        success: false,
        message: TranslationService.t('error'),
        errors: [{ msg: 'Invalid namespace' }]
      });
      return;
    }
    
    const translations = LanguageManagementService.getTranslationsForLanguage(language, ns);
    
    res.json({
      success: true,
      message: TranslationService.t('success'),
      data: { 
        language,
        namespace: ns,
        translations 
      }
    });
  } catch (error) {
    next(error);
  }
}

  /**
   * Get translation statistics
   */
  static async getTranslationStatistics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = LanguageManagementService.getTranslationStatistics();
      
      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: { statistics: stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find missing translations
   */
  static async getMissingTranslations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const missing = LanguageManagementService.findMissingTranslations();
      
      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: { missing }
      });
    } catch (error) {
      next(error);
    }
  }
}