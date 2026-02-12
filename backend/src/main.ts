import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow frontend (e.g. localhost:5173) to talk to this API and WS gateway
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3005);
  console.log(`Backend is running on http://localhost:3005`);
}

bootstrap();
