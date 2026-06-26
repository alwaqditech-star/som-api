import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configureApp(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${port}`;

  console.log(`🚗 SOM Auctions API running on ${publicUrl}`);
  console.log(`📡 REST: ${publicUrl}/api/v1`);
  console.log(`📚 Swagger: ${publicUrl}/api/docs`);
}

bootstrap();
