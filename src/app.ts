import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env, isProduction } from './config/env';
import { errorHandler, notFound } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

// Railway / Render sit behind a reverse proxy: needed for correct client IPs (rate limiting).
app.set('trust proxy', 1);

// ---- Security & utility middleware
// The strict default CSP would block Swagger UI's assets, so the docs page gets helmet without CSP.
const helmetDefault = helmet();
const helmetDocs = helmet({ contentSecurityPolicy: false });
app.use((req, res, next) => (req.path.startsWith('/api-docs') ? helmetDocs : helmetDefault)(req, res, next));
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '10kb' }));
if (env.NODE_ENV !== 'test') app.use(morgan(isProduction ? 'combined' : 'dev')); // request logger

// Brute-force protection for register / login
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, please try again later' },
  }),
);

// ---- Docs & health
app.get('/', (_req, res) => res.redirect('/api-docs'));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Movie Ticket Booking API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ---- API
app.use('/api', routes);

// ---- Errors (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
