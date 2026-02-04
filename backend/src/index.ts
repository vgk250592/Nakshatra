import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { authRouter } from './api/routes/auth';
import { chartRouter } from './api/routes/chart';
import { predictionRouter } from './api/routes/prediction';
import { horaryRouter } from './api/routes/horary';
import { compatibilityRouter } from './api/routes/compatibility';
import { userRouter } from './api/routes/user';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/chart', chartRouter);
app.use('/api/v1/predictions', predictionRouter);
app.use('/api/v1/horary', horaryRouter);
app.use('/api/v1/compatibility', compatibilityRouter);
app.use('/api/v1/user', userRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`Nakshatra API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
