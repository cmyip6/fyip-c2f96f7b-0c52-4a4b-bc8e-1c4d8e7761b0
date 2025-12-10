// import {
//   type INestApplication,
//   InternalServerErrorException,
//   Logger,
//   ValidationPipe,
// } from '@nestjs/common';
// import {
//   Test,
//   type TestingModule,
//   type TestingModuleBuilder,
// } from '@nestjs/testing';
// import * as seeders from '../database/seed';
// import {
//   getDataSourceByName,
//   initializeTransactionalContext,
// } from 'typeorm-transactional';

// import { TestModule } from './modules/test.module';
// import { TypeORMMigrations } from '../helper/typeorm-migration';
// import { TaskManagementModule } from '../task-management.module';
// import { CONNECTION_NAME } from '../database/dbconfig';
// import { DecoratedSuites } from './modules/jest-test.decorator';
// import { BaseTest } from './test/base-test';

// const TESTTORUN = process.env['TESTTORUN'];
// const SUITETORUN = process.env['SUITETORUN'];
// const DROP_SCHEMA = process.env['DROP_SCHEMA'] === 'true';
// const RUN_MIGRATIONS = process.env['RUN_MIGRATIONS'] === 'true';
// const RUN_SEEDS = process.env['RUN_SEEDS'] === 'true';

// const initTestingNest = async (): Promise<INestApplication> => {
//   initializeTransactionalContext({ maxHookHandlers: 500 });
//   const logger = new Logger();

//   const testingModuleBuilder: TestingModuleBuilder = Test.createTestingModule({
//     imports: [TaskManagementModule, TestModule],
//   });

//   logger.log(`Compiling test modules...`);
//   const testingModule: TestingModule = await testingModuleBuilder.compile();

//   logger.log(`Creating test application...`);
//   const app: INestApplication = testingModule.createNestApplication({
//     logger,
//     bufferLogs: false,
//   });

//   app.setGlobalPrefix('api');
//   app.useGlobalPipes(
//     new ValidationPipe({
//       transform: true,
//       enableDebugMessages: true,
//       transformOptions: { enableImplicitConversion: true },
//       whitelist: true,
//       forbidNonWhitelisted: true,
//     }),
//   );

//   const dataSource = getDataSourceByName(CONNECTION_NAME);
//   if (!dataSource) {
//     throw new InternalServerErrorException('No datasource defined');
//   }

//   const migrations = new TypeORMMigrations(dataSource);

//   await migrations.run(
//     !!DROP_SCHEMA,
//     !!RUN_MIGRATIONS,
//     !!RUN_SEEDS,
//     Object.values(seeders),
//   );

//   const port = process.env.TEST_API_PORT || 4200;
//   const host = process.env.TEST_API_HOST || 'localhost';
//   const protocol = process.env.TEST_API_PROTOCOL || 'http';
//   await app.listen(port);

//   Logger.log(
//     `Testing Application is running on: ${protocol}://${host}:${port}/api`,
//   );

//   return app;
// };

// let app: INestApplication;
// beforeAll(async () => {
//   app = await initTestingNest();
// });

// describe('Task Management Test Suite', () => {
//   test('', () => {
//     for (const appTestClass of Object.keys(DecoratedSuites)) {
//       const testSuite = DecoratedSuites[appTestClass];
//       const c = app.get<BaseTest>(testSuite.target);
//       c.setApp(app);
//     }
//   });

//   const isSelectedToRun = (
//     actualName: string,
//     selectedName: string | undefined,
//   ): boolean => !selectedName || selectedName === actualName;

//   for (const appTestClass of Object.keys(DecoratedSuites)) {
//     const testSuite = DecoratedSuites[appTestClass];
//     if (isSelectedToRun(testSuite.title, SUITETORUN)) {
//       describe(testSuite.title, () => {
//         for (const testMethod of testSuite.tests) {
//           if (isSelectedToRun(testMethod.description, TESTTORUN)) {
//             it(testMethod.description, async () => {
//               const logger = new Logger('E2E-TEST');
//               const start = moment();
//               logger.log({
//                 level: 'warn',
//                 message: `=========> Running test: ${testSuite.title} / ${testMethod.description}`,
//               });
//               const c = app.get<BaseTest>(testSuite.target);
//               let result = true;
//               try {
//                 await testMethod.method.apply(c);
//               } catch (error) {
//                 result = false;
//                 throw error;
//               } finally {
//                 logger.log({
//                   level: 'crit',
//                   message: `=========> Test '${testSuite.title} / ${testMethod.description}' finished: [${moment().diff(
//                     start,
//                   )}] = ${result ? 'OK' : 'Error'}`,
//                 });
//               }
//             });
//           }
//         }
//       });
//     }
//   }
// });

// afterAll(async (): Promise<void> => {
//   if (app) {
//     await app.close();
//   }
// });
