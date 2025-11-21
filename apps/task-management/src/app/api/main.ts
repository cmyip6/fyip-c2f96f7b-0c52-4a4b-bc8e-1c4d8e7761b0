import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { TaskManagementModule } from './task-management.module';

async function bootstrap(): Promise<void> {
  initializeTransactionalContext();

  const app =
    await NestFactory.create<NestExpressApplication>(TaskManagementModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that are not in the DTO
      forbidNonWhitelisted: true, // Throws error if unknown properties are sent
      transform: true, // Automatically transforms payloads (e.g., string "1" -> number 1)
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
