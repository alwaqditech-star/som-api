import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

type ServerlessHandler = ReturnType<typeof serverlessExpress>;

let cachedHandler: ServerlessHandler | null = null;
let initError: Error | null = null;

async function getHandler(): Promise<ServerlessHandler> {
  if (cachedHandler) return cachedHandler;
  if (initError) throw initError;

  try {
    const expressApp = express();
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    await configureApp(app);
    await app.init();
    cachedHandler = serverlessExpress({ app: expressApp });
    return cachedHandler;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw initError;
  }
}

export default async function handler(req: express.Request, res: express.Response) {
  try {
    const server = await getHandler();
    return server(req, res);
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
