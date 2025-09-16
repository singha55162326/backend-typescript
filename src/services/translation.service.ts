import i18next from '../config/i18n';

export class TranslationService {
  /**
   * Get translation for a key
   * @param key Translation key
   * @param language Language code (optional, will use default if not provided)
   * @param options Interpolation options (optional)
   * @returns Translated string
   */
  static t(key: string, language?: string, options?: any): string {
    try {
      // If language is provided, use it; otherwise use the default language
      if (language) {
        const t = i18next.getFixedT(language);
        return t(key, options) as string;
      }
      
      // Use the current language from i18next
      return i18next.t(key, options) as string;
    } catch (error) {
      // Return the key if translation fails
      return key;
    }
  }

  /**
   * Get translation for a key with namespace
   * @param namespace Translation namespace
   * @param key Translation key
   * @param language Language code (optional, will use default if not provided)
   * @param options Interpolation options (optional)
   * @returns Translated string
   */
  static tWithNamespace(namespace: string, key: string, language?: string, options?: any): string {
    try {
      const fullKey = `${namespace}:${key}`;
      
      // If language is provided, use it; otherwise use the default language
      if (language) {
        const t = i18next.getFixedT(language);
        return t(fullKey, options) as string;
      }
      
      // Use the current language from i18next
      return i18next.t(fullKey, options) as string;
    } catch (error) {
      // Return the key if translation fails
      return key;
    }
  }

  /**
   * Get available languages
   * @returns Array of supported language codes
   */
  static getSupportedLanguages(): string[] {
    const supportedLngs = i18next.options.supportedLngs;
    if (supportedLngs && Array.isArray(supportedLngs)) {
      return [...supportedLngs] as string[];
    }
    return ['en', 'lo'];
  }

  /**
   * Change language for the current session
   * @param language Language code
   */
  static changeLanguage(language: string): void {
    i18next.changeLanguage(language);
  }

  /**
   * Get current language
   * @returns Current language code
   */
  static getCurrentLanguage(): string {
    return i18next.language;
  }
}