import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let cachedApp: Express | null = null;
let initError: Error | null = null;
let initPromise: Promise<Express> | null = null;

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const expressApp = express();
      const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(expressApp),
      );
      await configureApp(app);
      await app.init();
      cachedApp = expressApp;
      return cachedApp;
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error));
      initPromise = null;
      throw initError;
    }
  })();

  return initPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message,
        hint: 'DB_DATABASE=railway (مو radiant-presence) — radiant-presence اسم المشروع فقط',
      });
    }
  }
}
