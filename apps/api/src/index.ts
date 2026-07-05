import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import healthRouter from './routes/health';
import organizationsRouter from './routes/organizations';
import projectsRouter from './routes/projects';
import queuesRouter from './routes/queues';
import jobsRouter from './routes/jobs';
import workersRouter from './routes/workers';
import internalRouter from './routes/internal';
import dashboardRouter from './routes/dashboard';
import { authMiddleware } from './middleware/auth';
import { startStaleWorkerSweeper, stopStaleWorkerSweeper } from './services/staleWorkerSweeper';
import { startCronChecker, stopCronChecker } from './services/cronChecker';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Global middleware ──────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.VERCEL_PROJECT_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// ─── Swagger docs ───────────────────────────────────────────────────────────────

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Scheduler API',
      version: '1.0.0',
      description: 'Distributed Job Scheduling Platform REST API',
    },
    servers: [
      { url: process.env.API_BASE_URL || `http://localhost:${PORT}` },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// ─── Routes ─────────────────────────────────────────────────────────────────────

// Public routes
app.use('/api/health', healthRouter);

// Internal routes (secured with internal token, no Clerk auth)
app.use('/api/internal', internalRouter);

// Authenticated routes
app.use('/api/organizations', authMiddleware, organizationsRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/queues', authMiddleware, queuesRouter);
app.use('/api/jobs', authMiddleware, jobsRouter);
app.use('/api/workers', authMiddleware, workersRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);

// ─── Error handler ──────────────────────────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// ─── Start server ───────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Job Scheduler API running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check at http://localhost:${PORT}/api/health\n`);

  // Start background services
  startStaleWorkerSweeper();
  startCronChecker();
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────────

function shutdown() {
  console.log('\n🔄 Shutting down gracefully...');
  stopStaleWorkerSweeper();
  stopCronChecker();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
