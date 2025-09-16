import { LanguageManagementService } from '../services/language-management.service';
import { TranslationService } from '../services/translation.service';

describe('Translation Management System', () => {
  describe('LanguageManagementService', () => {
    test('should return supported languages', () => {
      const languages = LanguageManagementService.getSupportedLanguages();
      expect(languages).toEqual([
        { code: 'en', name: 'English' },
        { code: 'lo', name: 'Lao' }
      ]);
    });

    test('should return available namespaces', () => {
      const namespaces = LanguageManagementService.getAvailableNamespaces();
      expect(namespaces).toEqual(['common', 'booking', 'analytics', 'reviews', 'loyalty']);
    });

    test('should return translations for a language and namespace', () => {
      const translations = LanguageManagementService.getTranslationsForLanguage('en', 'common');
      expect(translations).toHaveProperty('welcome');
      expect(translations.welcome).toBe('Welcome to Stadium Booking System');
    });

    test('should return translation statistics', () => {
      const stats = LanguageManagementService.getTranslationStatistics();
      expect(stats).toHaveProperty('en');
      expect(stats).toHaveProperty('lo');
      expect(stats.en).toHaveProperty('common');
      expect(stats.en).toHaveProperty('booking');
    });
  });

  describe('TranslationService', () => {
    test('should translate a key', () => {
      const translation = TranslationService.t('welcome', 'en');
      expect(translation).toBe('Welcome to Stadium Booking System');
    });

    test('should translate a key with namespace', () => {
      const translation = TranslationService.tWithNamespace('booking', 'bookingConfirmation', 'en');
      expect(translation).toBe('Booking Confirmation');
    });

    test('should return supported languages', () => {
      const languages = TranslationService.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('lo');
    });
  });
});