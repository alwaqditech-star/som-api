import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let cachedServer: express.Express | null = null;
let initError: Error | null = null;

async function getServer(): Promise<express.Express> {
  if (cachedServer) return cachedServer;
  if (initError) throw initError;

  try {
    const server = express();
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(server),
    );
    await configureApp(app);
    await app.init();
    cachedServer = server;
    return server;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw initError;
  }
}

export default async function handler(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  try {
    const server = await getServer();
    server(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message,
        hint: 'تحقق من DB_HOST و DB_PASSWORD و DB_DATABASE=railway على Vercel',
      });
    }
  }
}
