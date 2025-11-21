import { NestFactory } from '@nestjs/core';
import * as seeders from './database/seed';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  addTransactionalDataSource,
  getDataSourceByName,
  initializeTransactionalContext,
} from 'typeorm-transactional';
import { TaskManagementModule } from './task-management.module';
import { TypeORMMigrations } from './helper';
import { CONNECTION_NAME } from './database/dbconfig';

const DROP_SCHEMA = process.env['DROP_SCHEMA'] === 'true';
const RUN_MIGRATIONS = process.env['RUN_MIGRATIONS'] === 'true';
const RUN_SEEDS = process.env['RUN_SEEDS'] === 'true';

async function bootstrap(): Promise<void> {
  initializeTransactionalContext();

  const app =
    await NestFactory.create<NestExpressApplication>(TaskManagementModule);

  const dataSource = getDataSourceByName(CONNECTION_NAME);
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  addTransactionalDataSource({ dataSource, name: CONNECTION_NAME });
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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
