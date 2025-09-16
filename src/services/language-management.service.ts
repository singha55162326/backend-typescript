import i18next from '../config/i18n';
import { TranslationService } from './translation.service';

export class LanguageManagementService {
  /**
   * Get all supported languages with their details
   * @returns Array of supported languages with names and codes
   */
  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    const supportedLngs = TranslationService.getSupportedLanguages();
    
    // Map language codes to readable names
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'lo': 'Lao',
      // Add more languages as needed
    };
    
    return supportedLngs.map(code => ({
      code,
      name: languageNames[code] || code
    }));
  }

  /**
   * Get all available namespaces
   * @returns Array of available namespaces
   */
  static getAvailableNamespaces(): string[] {
    const namespaces = i18next.options.ns;
    if (namespaces && Array.isArray(namespaces)) {
      return [...namespaces];
    }
    return ['common'];
  }

  /**
   * Get all translation keys for a specific language and namespace
   * @param language Language code
   * @param namespace Translation namespace
   * @returns Object containing all translation keys and values
   */
  static getTranslationsForLanguage(language: string, namespace: string = 'common'): any {
    try {
      // Load translations for the specific language and namespace
      const translations = i18next.getResourceBundle(language, namespace);
      return translations || {};
    } catch (error) {
      console.error(`Error loading translations for ${language}:${namespace}`, error);
      return {};
    }
  }

  /**
   * Get translation statistics for all languages
   * @returns Object containing translation completion statistics
   */
  static getTranslationStatistics(): any {
    const supportedLanguages = TranslationService.getSupportedLanguages();
    const namespaces = this.getAvailableNamespaces();
    
    const stats: any = {};
    
    supportedLanguages.forEach(lang => {
      stats[lang] = {};
      namespaces.forEach(ns => {
        const translations = this.getTranslationsForLanguage(lang, ns);
        const keyCount = Object.keys(translations).length;
        stats[lang][ns] = {
          keyCount,
          translated: keyCount > 0
        };
      });
    });
    
    return stats;
  }

  /**
   * Compare translations between languages to find missing keys
   * @param referenceLanguage Language to use as reference (default: 'en')
   * @returns Object containing missing translation keys
   */
  static findMissingTranslations(referenceLanguage: string = 'en'): any {
    const supportedLanguages = TranslationService.getSupportedLanguages();
    const namespaces = this.getAvailableNamespaces();
    
    const missing: any = {};
    
    // Get reference keys
    const referenceKeys: any = {};
    namespaces.forEach(ns => {
      referenceKeys[ns] = Object.keys(this.getTranslationsForLanguage(referenceLanguage, ns));
    });
    
    // Compare with other languages
    supportedLanguages
      .filter(lang => lang !== referenceLanguage)
      .forEach(lang => {
        missing[lang] = {};
        namespaces.forEach(ns => {
          const langTranslations = this.getTranslationsForLanguage(lang, ns);
          const langKeys = Object.keys(langTranslations);
          
          const missingKeys = referenceKeys[ns].filter((key: string) => !langKeys.includes(key));
          if (missingKeys.length > 0) {
            missing[lang][ns] = missingKeys;
          }
        });
      });
    
    return missing;
  }
}