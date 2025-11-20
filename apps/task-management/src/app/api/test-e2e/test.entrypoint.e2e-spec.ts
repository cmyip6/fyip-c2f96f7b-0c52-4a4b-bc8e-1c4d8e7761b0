import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import * as bodyParser from 'body-parser';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { TestModule } from './modules/test.module';
import * as seeds from '../database/seed';
import { NewBaseTest } from './test/base-test';
import { TypeORMMigrations } from '../helper/typeorm-migration';
import { DataSource } from 'typeorm';

const TESTTORUN = process.env['TESTTORUN'];
const SUITETORUN = process.env['SUITETORUN'];
const DROP_SCHEMA = process.env['DROP_SCHEMA'];
const EXECUTE_MIGRATIONS = process.env['EXECUTE_MIGRATIONS'];
const IMPORT_SEEDS = process.env['IMPORT_SEEDS'];

const initTestingNest = async (): Promise<INestApplication> => {
  initializeTransactionalContext({ maxHookHandlers: 500 });
  const logger = new Logger();

  const testingModuleBuilder: TestingModuleBuilder = Test.createTestingModule({
    imports: [TaskManagementModule, TestModule],
  })
    .overrideProvider(ConsumeEndpointService)
    .useClass(FakeConsumeEndpoint);

  logger.log(`Compiling test modules...`);
  const testingModule: TestingModule = await testingModuleBuilder.compile();

  logger.log(`Creating test application...`);
  const app: INestApplication = testingModule.createNestApplication({
    logger,
    bufferLogs: false,
  });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const dataSource = app.get<DataSource>(getDataSourceToken(DATABASE_NAME));
  const migrations = new TypeORMMigrations(dataSource);

  await migrations.run(
    !!DROP_SCHEMA,
    !!EXECUTE_MIGRATIONS,
    !!IMPORT_SEEDS,
    seedsTypes,
    seedTable,
  );

  return await startupMtTestApp(
    TaskManagementModule,
    TestModule,
    ConfigServiceVars,
    [...Object.values(seeds)],
    'WORKFLOW',
    builderInit,
    appInit,
  );
};

let app: INestApplication;
beforeAll(async () => {
  app = await initNest();
});

describe('Task Management Test Suite', () => {
  // eslint-disable-next-line
  test('', () => {
    for (const appTestClass of Object.keys(DecoratedSuites)) {
      const testSuite = DecoratedSuites[appTestClass];
      const c = app.get<NewBaseTest>(testSuite.target);
      c.setApp(app);
    }
  });

  const isSelectedToRun = (actualName, selectedName): boolean => {
    return !selectedName || selectedName === actualName;
  };

  for (const appTestClass of Object.keys(DecoratedSuites)) {
    const testSuite = DecoratedSuites[appTestClass];
    if (isSelectedToRun(testSuite.title, SUITETORUN)) {
      describe(testSuite.title, () => {
        for (const testMethod of testSuite.tests) {
          if (isSelectedToRun(testMethod.description, TESTTORUN)) {
            let funcToRun = it.concurrent;
            if (RUN_TESTS_IN_PARALLEL === false) {
              funcToRun = it;
            }
            funcToRun(testMethod.description, async () => {
              const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
              const start = moment();
              logger.log({
                level: 'warn',
                message: `=========> Running test: ${testSuite.title} / ${testMethod.description}`,
              });
              const c = app.get<NewBaseTest>(testSuite.target);
              let result = true;
              try {
                await clsService.run(async () => {
                  multitenancyContext.setTenantId(
                    multitenancyService.getFirstTenantId(),
                  );
                  await testMethod.method.apply(c);
                });
              } catch (error) {
                result = false;
                if (appConfigService.getString('TM_LOGGER_LEVEL') === 'crit') {
                  logger.log({ level: 'fatal', message: 'Test Error', error });
                }
                throw error;
              } finally {
                logger.log({
                  level: 'crit',
                  message: `=========> Test '${testSuite.title} / ${testMethod.description}' finished: [${moment().diff(
                    start,
                  )}] = ${result ? 'OK' : 'Error'}`,
                });
              }
            });
          }
        }
      });
    }
  }
});

afterAll(async (): Promise<void> => {
  if (app) await app.close();
});
function getDataSourceToken(
  DATABASE_NAME: any,
): string | symbol | Function | import('@nestjs/common').Type<DataSource> {
  throw new Error('Function not implemented.');
}
