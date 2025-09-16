import { Request, Response, NextFunction } from 'express';
import i18next from '../config/i18n';
import User from '../models/User';

/**
 * Middleware to set language based on user preferences
 */
export const setLanguageFromUserPreferences = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    // If user is authenticated, get their preferred language
    if (req.user && req.user.userId) {
      const user = await User.findById(req.user.userId);
      if (user && user.profile && user.profile.preferredLanguage) {
        // Check if the preferred language is supported
        const supportedLanguages = i18next.options.supportedLngs || ['en', 'lo'];
        if (supportedLanguages.includes(user.profile.preferredLanguage)) {
          // Set the language for this request
          req.language = user.profile.preferredLanguage;
          i18next.changeLanguage(user.profile.preferredLanguage);
        }
      }
    }
    
    next();
  } catch (error) {
    // If there's an error, continue with default language
    next();
  }
};

/**
 * Middleware to set language from query parameter or header
 */
export const setLanguageFromRequest = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    let language = 'lo'; // Default to Lao
    
    // Check query parameter
    if (req.query.lang && typeof req.query.lang === 'string') {
      language = req.query.lang;
    }
    // Check Accept-Language header
    else if (req.headers['accept-language']) {
      const acceptLanguage = req.headers['accept-language'] as string;
      // Simple parsing - take the first language
      const languages = acceptLanguage.split(',');
      if (languages.length > 0) {
        language = languages[0].split('-')[0]; // Take base language (e.g., 'en' from 'en-US')
      }
    }
    
    // Validate language is supported
    const supportedLanguages = i18next.options.supportedLngs || ['en', 'lo'];
    if (supportedLanguages.includes(language)) {
      req.language = language;
      i18next.changeLanguage(language);
    }
    
    next();
  } catch (error) {
    // If there's an error, continue with default language
    next();
  }
};