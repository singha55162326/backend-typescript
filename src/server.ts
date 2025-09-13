import express, { Express, Request, Response } from 'express';
// import mongoose from 'mongoose';
import cors from 'cors';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
// import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { setupSwagger } from './config/swagger';
import connectDB from './config/database';
import SchedulerService from './utils/scheduler';
import path from 'path'; // ← Make sure to import path

// Import routes
import authRoutes from './routes/auth';
// import userRoutes from './routes/users';
import stadiumRoutes from './routes/stadium';
import bookingRoutes from './routes/bookings';

import analyticsRoutes from './routes/analytics';
// import notificationRoutes from './routes/notifications';

// Import middleware
import { authenticateToken, authorizeRoles } from './middleware/auth';
import {errorHandler} from './middleware/errorHandler';

dotenv.config();

const app: Express = express();

// Connect to database
connectDB();

// Initialize scheduler
SchedulerService.init();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
     // Vite dev server
  ],
  credentials: true,
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
// app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/stadiums', stadiumRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
// app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), analyticsRoutes);
// app.use('/api/notifications', authenticateToken, notificationRoutes);
// ✅ Serve static files from uploads directory



app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, _path) => {
    // Set proper CORS headers for images
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