import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export async function configureApp(app: NestExpressApplication): Promise<void> {
  const uploadsPath = process.env.VERCEL
    ? join('/tmp', 'uploads')
    : join(process.cwd(), 'uploads');

  if (!existsSync(uploadsPath)) mkdirSync(uploadsPath, { recursive: true });

  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SOM Auctions API')
    .setDescription('منصة مزادات سيارات - REST & WebSocket API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'المصادقة والتسجيل')
    .addTag('users', 'المستخدمون')
    .addTag('vehicles', 'السيارات')
    .addTag('auctions', 'المزادات')
    .addTag('bids', 'المزايدات')
    .addTag('wallets', 'المحفظة والودائع')
    .addTag('notifications', 'الإشعارات')
    .addTag('categories', 'التصنيفات والماركات')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const http = app.getHttpAdapter().getInstance();
  http.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok', api: '/api/v1', docs: '/api/docs' });
  });
}
