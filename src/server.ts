import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

const start = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`📚 Swagger docs: http://localhost:${env.PORT}/api-docs`);
  });

  // Graceful shutdown (Railway / Render send SIGTERM on redeploy)
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
};

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
