import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '3mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must list the trusted dashboard origins in production.');
  }
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
  });
  await app.listen(process.env.PORT ?? 3000);
  console.log(`DoSJE API running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
