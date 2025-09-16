import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector) // Add language detector
  .init({
    // Default language
    lng: 'lo', // Lao as default since the app seems to be primarily for Lao users
    // Fallback language
    fallbackLng: 'en',
    // Languages we support
    supportedLngs: ['en', 'lo'],
    // Namespaces
    ns: ['common', 'booking', 'analytics', 'reviews', 'loyalty'],
    defaultNS: 'common',
    // Backend configuration for loading translation files
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
    },
    // Detection options (for detecting user language)
    detection: {
      // Order and from where user language should be detected
      order: ['querystring', 'cookie', 'header'],
      
      // Keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupHeader: 'accept-language',
      
      // Cache user language
      caches: ['cookie'],
      cookieMinutes: 10,
      cookieDomain: 'localhost'
    },
    // Debug mode
    debug: process.env.NODE_ENV === 'development',
    // Interpolation options
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

export default i18next;
export { middleware };