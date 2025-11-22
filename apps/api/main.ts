import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as seeders from './database/seed';
import {
  ValidationPipe,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  getDataSourceByName,
  initializeTransactionalContext,
} from 'typeorm-transactional';
import { TaskManagementModule } from './task-management.module';
import { CONNECTION_NAME } from './database/dbconfig';
import { TypeORMMigrations } from './helper/typeorm-migration';

const DROP_SCHEMA = process.env['DROP_SCHEMA'] === 'true';
const RUN_MIGRATIONS = process.env['RUN_MIGRATIONS'] === 'true';
const RUN_SEEDS = process.env['RUN_SEEDS'] === 'true';

async function bootstrap(): Promise<void> {
  initializeTransactionalContext();

  const app =
    await NestFactory.create<NestExpressApplication>(TaskManagementModule);

  const dataSource = getDataSourceByName(CONNECTION_NAME);
  if (!dataSource) {
    throw new InternalServerErrorException('No datasource defined');
  }

  const migration = new TypeORMMigrations(dataSource);

  await migration.run(
    DROP_SCHEMA,
    RUN_MIGRATIONS,
    RUN_SEEDS,
    Object.values(seeders),
  );

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      enableDebugMessages: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.API_PORT || 4200;
  const host = process.env.API_HOST || 'localhost';
  const protocol = process.env.API_PROTOCOL || 'http';
  await app.listen(port);

  Logger.log(`Application is running on: ${protocol}://${host}:${port}/api`);
}

bootstrap();
