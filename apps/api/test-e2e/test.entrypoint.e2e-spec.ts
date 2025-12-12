import * as dotenv from 'dotenv';
if (process.env['NODE_ENV'] === 'test') {
  dotenv.config({ path: '.env.test' });
}
import './test';
import {
  type INestApplication,
  InternalServerErrorException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
  type TestingModuleBuilder,
} from '@nestjs/testing';
import * as seeders from '../database/seed';
import {
  getDataSourceByName,
  initializeTransactionalContext,
} from 'typeorm-transactional';

import { TypeORMMigrations } from '../helper/typeorm-migration';
import { CONNECTION_NAME } from '../database/dbconfig';
import { TestSuitesStorage } from './modules/jest-test.decorator';
import { BaseTest } from './test/base-test';
import { TestModule } from './modules/test.module';
import cookieParser from 'cookie-parser';
import moment from 'moment';

const TESTTORUN = process.env['TESTTORUN'];
const SUITETORUN = process.env['SUITETORUN'];
const DROP_SCHEMA = process.env['DROP_SCHEMA'] === 'true';
const RUN_MIGRATIONS = process.env['RUN_MIGRATIONS'] === 'true';
const RUN_SEEDS = process.env['RUN_SEEDS'] === 'true';
const port = process.env.TEST_API_PORT || 4201;
const host = process.env.TEST_API_HOST || 'localhost';
const protocol = process.env.TEST_API_PROTOCOL || 'http';

const initTestingNest = async (): Promise<INestApplication> => {
  initializeTransactionalContext({ maxHookHandlers: 500 });
  const logger = new Logger();

  const testProviders = Array.from(TestSuitesStorage.values()).map(
    (suite) => suite.target,
  );

  const testingModuleBuilder: TestingModuleBuilder = Test.createTestingModule({
    imports: [TestModule],
    providers: [...testProviders],
  });

  logger.log(`Compiling test modules...`);
  const testingModule: TestingModule = await testingModuleBuilder.compile();

  logger.log(`Creating test application...`);
  const app: INestApplication = testingModule.createNestApplication({
    logger,
    bufferLogs: false,
  });

  const url = `${protocol}://${host}:${port}`;
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
  });
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

  const dataSource = getDataSourceByName(CONNECTION_NAME);
  if (!dataSource) {
    throw new InternalServerErrorException('No datasource defined');
  }

  const migrations = new TypeORMMigrations(dataSource);

  await migrations.run(
    !!DROP_SCHEMA,
    !!RUN_MIGRATIONS,
    !!RUN_SEEDS,
    Object.values(seeders),
  );

  await app.listen(port);

  Logger.log(`Testing Application is running on: ${url}/api`);

  return app;
};

describe('E2E Test Runner', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await initTestingNest();
  });

  test('Setting up', () => {
    for (const testSuite of Array.from(TestSuitesStorage.values())) {
      const c = app.get<BaseTest>(testSuite.target);
      c.setApp(app);
    }
  });

  for (const [className, suite] of TestSuitesStorage) {
    if (SUITETORUN && suite.title !== SUITETORUN) continue;
    const logger = new Logger(className);

    describe(suite.title, () => {
      for (const testMeta of suite.tests) {
        if (TESTTORUN && testMeta.description !== TESTTORUN) continue;

        it(testMeta.description, async () => {
          const start = moment();

          logger.log(`▶ Starting: ${suite.title} > ${testMeta.description}`);

          const testInstance = app.get(suite.target);

          let success = true;
          try {
            await (testInstance as any)[testMeta.propertyKey]();
          } catch (e) {
            success = false;
            throw e;
          } finally {
            const duration = moment().diff(start);

            if (success) {
              logger.log(
                `✅ Finished: [${duration}ms] ${testMeta.description}`,
              );
            } else {
              logger.error(
                `❌ Finished: [${duration}ms] ${testMeta.description}`,
              );
            }
          }
        });
      }
    });
  }

  afterAll(async () => {
    if (app) await app.close();
  });
});
