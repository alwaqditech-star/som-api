import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsPath = join(process.cwd(), 'uploads');
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${port}`;
  console.log(`🚗 SOM Auctions API running on ${publicUrl}`);
  console.log(`📡 REST: ${publicUrl}/api/v1`);
  console.log(`📚 Swagger: ${publicUrl}/api/docs`);
}

bootstrap();
