import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let cachedServer: express.Express | null = null;

async function getServer(): Promise<express.Express> {
  if (cachedServer) return cachedServer;

  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  await configureApp(app);
  await app.init();
  cachedServer = server;
  return server;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const server = await getServer();
  server(req, res);
}
