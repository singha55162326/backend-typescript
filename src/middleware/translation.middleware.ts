import { Request, Response, NextFunction } from 'express';
import { TranslationService } from '../services/translation.service';

declare global {
  namespace Express {
    interface Request {
      t: (key: string, options?: any) => string;
    }
  }
}

/**
 * Middleware to add translation function to request object
 */
export const translationMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Add translation function to request object
  req.t = (key: string, options?: any): string => {
    // Get language from request or use default
    const language = (req as any).language || TranslationService.getCurrentLanguage();
    return TranslationService.t(key, language, options);
  };
  
  next();
};