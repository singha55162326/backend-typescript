import express, { Express, Request, Response } from 'express';
// import mongoose from 'mongoose';
import cors from 'cors';

import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
// import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path'; // ← Make sure to import path
import connectDB from './config/database';
import { setupSwagger } from './config/swagger';
import SchedulerService from './utils/scheduler';
import i18next, { middleware } from './config/i18n'; // Import i18n configuration
import { setLanguageFromRequest } from './middleware/language.middleware'; // Import language middleware
import { translationMiddleware } from './middleware/translation.middleware'; // Import translation middleware

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import bookingRoutes from './routes/bookings';
import stadiumRoutes from './routes/stadium';

import analyticsRoutes from './routes/analytics';
import reviewRoutes from './routes/reviews';
import loyaltyRoutes from './routes/loyalty';
import translationRoutes from './routes/translations';
import calendarRoutes from './routes/calendar';
import faqRoutes from './routes/faq';

// import notificationRoutes from './routes/notifications';

// Import middleware
import { authenticateToken, authorizeRoles } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();

// Connect to database
connectDB();

// Initialize scheduler
SchedulerService.init();

// Initialize i18n middleware
app.use(middleware.handle(i18next));

// Set language from request (query param or header)
app.use(setLanguageFromRequest);

// Add translation function to request object
app.use(translationMiddleware);

// Security middleware
app.use(helmet());

// 👇 FIX: Trust proxy to avoid X-Forwarded-For validation error
app.set('trust proxy', 1);
// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://stadium-booking.netlify.app'
];

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Handle preflight requests
app.options('/*splat', cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10k requests per 15 minutes (effectively unlimited for normal use)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
// app.use(mongoSanitize());

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/stadiums', stadiumRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/analytics', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), analyticsRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/faq', faqRoutes);
// app.use('/api/notifications', authenticateToken, notificationRoutes);
// ✅ Serve static files from uploads directory



// Serve static files from project root's uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, _path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(/(.*)/, (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;